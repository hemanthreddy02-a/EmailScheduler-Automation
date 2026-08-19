/**
 * BullMQ email worker.
 *
 * IDEMPOTENCY STATE MACHINE:
 *
 *   SCHEDULED ──► PROCESSING ──► SENT
 *                      │
 *                      └──► FAILED (after max retries)
 *
 * The transition from SCHEDULED → PROCESSING is done atomically using
 * a conditional update (WHERE status = SCHEDULED). This prevents two
 * concurrent workers from processing the same job.
 *
 * If BullMQ delivers the same job twice (e.g., after a crash during processing),
 * the second worker will find status = PROCESSING or SENT and abort gracefully.
 *
 * IMPORTANT NOTE ON EXACTLY-ONCE:
 * SMTP delivery itself is NOT transactional with the database. If the worker
 * sends the email but crashes before updating status to SENT, the job may
 * retry and attempt another send. To mitigate this:
 *  - We check status = SENT at the very start of each attempt
 *  - We use short retry windows so duplicate sends are minimized
 *  - Ethereal captures all sends so duplicates are detectable
 *
 * RATE LIMITING:
 * The pre-calculated schedule already respects hourly limits, but the Redis
 * rate limiter provides distributed safety when multiple workers run.
 * If a limit is reached, the job is NOT failed — it's rescheduled to the
 * next hour window, preserving ordering.
 *
 * RESTART SAFETY:
 * BullMQ stores delayed jobs in Redis sorted sets (ZSET). The worker does NOT
 * need to re-read the database on startup. When you restart the worker, BullMQ
 * automatically resumes processing any jobs that became due while the worker
 * was stopped.
 */

import { Worker, Job } from "bullmq";
import { EmailJobStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { createRedisClient } from "../utils/redis.js";
import { sendEmail } from "../services/smtpService.js";
import {
  tryAcquireRateLimit,
  getNextHourWindowStart,
} from "../services/rateLimitService.js";
import { emailQueue, EMAIL_QUEUE_NAME } from "../queues/emailQueue.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import type { EmailJobPayload } from "../types/index.js";

// ─── Per-Sender Minimum Delay Coordination ────────────────────────────────────
// Redis key to track when the last email was sent per sender.
// This ensures MIN_EMAIL_DELAY_MS is respected across concurrent workers.
const SENDER_LAST_SENT_PREFIX = "sender-last-sent";

async function waitForSenderSlot(
  senderId: string,
  redisClient: ReturnType<typeof createRedisClient>
): Promise<void> {
  const key = `${SENDER_LAST_SENT_PREFIX}:${senderId}`;
  const minDelay = config.worker.minEmailDelayMs;

  // Atomic Lua: get last sent time, check if enough time has passed,
  // if yes update last sent time and return 0 (proceed), else return wait ms
  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local minDelay = tonumber(ARGV[2])
    
    local lastSent = redis.call('GET', key)
    if lastSent == false then
      redis.call('SET', key, now, 'EX', 60)
      return 0
    end
    
    local elapsed = now - tonumber(lastSent)
    if elapsed >= minDelay then
      redis.call('SET', key, now, 'EX', 60)
      return 0
    else
      return minDelay - elapsed
    end
  `;

  const maxWait = 30_000; // Max 30 seconds total wait
  let waited = 0;

  while (waited < maxWait) {
    const now = Date.now();
    const waitMs = (await redisClient.eval(
      luaScript,
      1,
      key,
      String(now),
      String(minDelay)
    )) as number;

    if (waitMs <= 0) {
      return; // Slot acquired
    }

    // Wait the required time before next attempt
    const sleepMs = Math.min(waitMs, 500);
    await new Promise((r) => setTimeout(r, sleepMs));
    waited += sleepMs;
  }

  // Proceed anyway after max wait to avoid deadlock
  logger.warn({ senderId }, "Sender slot wait timeout — proceeding");
}

// ─── Job Processor ───────────────────────────────────────────────────────────

async function processEmail(job: Job<EmailJobPayload>): Promise<void> {
  const { emailJobId } = job.data;
  const workerRedis = createRedisClient("worker-temp");

  logger.info({ jobId: job.id, emailJobId }, "Processing email job");

  // ─── Step 1: Load the EmailJob from PostgreSQL ────────────────────────────
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true },
  });

  if (!emailJob) {
    logger.warn({ emailJobId }, "EmailJob not found — skipping");
    await workerRedis.quit();
    return;
  }

  // ─── Step 2: Idempotency check ────────────────────────────────────────────
  if (emailJob.status === EmailJobStatus.SENT) {
    logger.info(
      { emailJobId, status: emailJob.status },
      "Email already SENT — skipping (idempotency)"
    );
    await workerRedis.quit();
    return;
  }

  if (emailJob.status === EmailJobStatus.FAILED) {
    logger.warn(
      { emailJobId },
      "Email marked FAILED — BullMQ is retrying, processing anyway"
    );
    // Allow retry — BullMQ's retry policy handles this
  }

  // ─── Step 3: Check distributed rate limit ─────────────────────────────────
  const { allowed } = await tryAcquireRateLimit(
    emailJob.senderId,
    new Date()
  );

  if (!allowed) {
    // Reschedule to next hour window — do NOT fail the job
    const nextWindowStart = getNextHourWindowStart();
    const delayMs = nextWindowStart.getTime() - Date.now();

    logger.info(
      {
        emailJobId,
        senderId: emailJob.senderId,
        nextWindowStart,
        delayMs,
      },
      "Rate limit reached — rescheduling to next hour window"
    );

    // Update scheduledAt in DB
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { scheduledAt: nextWindowStart },
    });

    // Add a new delayed job for the next window
    // Use a modified jobId to avoid duplicate key error
    const newJobId = `${emailJobId}-retry-${Date.now()}`;
    await emailQueue.add(
      "send-email",
      { emailJobId },
      {
        jobId: newJobId,
        delay: delayMs,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      }
    );

    await workerRedis.quit();
    return; // Current job is done (successfully dequeued, rescheduled)
  }

  // ─── Step 4: Enforce minimum sender delay (distributed) ──────────────────
  await waitForSenderSlot(emailJob.senderId, workerRedis);

  // ─── Step 5: Atomic state transition SCHEDULED → PROCESSING ──────────────
  // Using a conditional update to prevent two workers from processing
  // the same job simultaneously
  const updated = await prisma.emailJob.updateMany({
    where: {
      id: emailJobId,
      status: {
        in: [EmailJobStatus.SCHEDULED, EmailJobStatus.FAILED],
      },
    },
    data: {
      status: EmailJobStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    logger.info(
      { emailJobId },
      "Could not transition to PROCESSING (already processing or sent) — skipping"
    );
    await workerRedis.quit();
    return;
  }

  // ─── Step 6: Send the email ───────────────────────────────────────────────
  try {
    const result = await sendEmail({
      from: emailJob.sender.email,
      to: emailJob.recipient,
      subject: emailJob.subject,
      body: emailJob.body,
    });

    // ─── Step 7: Mark as SENT ─────────────────────────────────────────────
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailJobStatus.SENT,
        sentAt: new Date(),
        errorMessage: null,
        bullJobId: job.id ?? null,
      },
    });

    logger.info(
      {
        emailJobId,
        recipient: emailJob.recipient,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      },
      "Email sent successfully"
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown SMTP error";

    logger.error(
      { emailJobId, recipient: emailJob.recipient, err },
      "Email send failed"
    );

    // Mark back to FAILED so BullMQ can retry
    // BullMQ will call processEmail again according to retry policy
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailJobStatus.FAILED,
        errorMessage,
        bullJobId: job.id ?? null,
      },
    });

    throw err; // Re-throw so BullMQ knows to retry
  } finally {
    await workerRedis.quit();
  }
}

// ─── Worker Factory ───────────────────────────────────────────────────────────

export function createEmailWorker(): Worker<EmailJobPayload> {
  const workerConnection = createRedisClient("email-worker");

  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    processEmail,
    {
      connection: workerConnection,
      concurrency: config.worker.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Worker: job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attemptsMade: job?.attemptsMade },
      "Worker: job failed"
    );
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Worker error");
  });

  logger.info(
    { concurrency: config.worker.concurrency, queue: EMAIL_QUEUE_NAME },
    "Email worker started"
  );

  return worker;
}
