/**
 * BullMQ email queue setup.
 *
 * WHY BULLMQ + REDIS?
 * BullMQ stores delayed jobs in Redis sorted sets. When you add a job with
 * a `delay`, it sits in a ZSET keyed by process-time. This persists across
 * restarts — the worker will pick them up when they become due, even after
 * the process was killed and restarted.
 *
 * This is fundamentally different from setTimeout/cron which live in memory
 * and are lost on restart.
 */

import { Queue, QueueEvents } from "bullmq";
import { createRedisClient } from "../utils/redis.js";
import { logger } from "../utils/logger.js";
import type { EmailJobPayload } from "../types/index.js";

export const EMAIL_QUEUE_NAME = "email-queue";

// Each Queue requires its own Redis connection
const queueConnection = createRedisClient("email-queue");

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000, // 5s → 10s → 20s
    },
    // Keep completed jobs for 24 hours (observability/debugging)
    removeOnComplete: {
      age: 86_400, // 24 hours in seconds
      count: 5_000,
    },
    // Keep failed jobs for 7 days
    removeOnFail: {
      age: 604_800, // 7 days
      count: 1_000,
    },
  },
});

emailQueue.on("error", (err) => {
  logger.error({ err }, "Email queue error");
});

// Optional: queue events for observability
export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: createRedisClient("email-queue-events"),
});

emailQueueEvents.on("completed", ({ jobId }) => {
  logger.info({ jobId }, "BullMQ job completed");
});

emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.warn({ jobId, failedReason }, "BullMQ job failed");
});

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}
