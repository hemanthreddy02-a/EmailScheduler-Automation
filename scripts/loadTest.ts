/**
 * Load Test Script — Queue 1000 delayed email jobs.
 *
 * Demonstrates that the architecture can queue high volume batches into
 * PostgreSQL + Redis/BullMQ efficiently without melting.
 *
 * Run with: pnpm test:load
 */

import { PrismaClient } from "@prisma/client";
import { scheduleEmails } from "../apps/api/src/services/schedulerService.js";
import { getQueueStats } from "../apps/api/src/queues/emailQueue.js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function runLoadTest() {
  console.log("\n🚀 Starting Load Test: Scheduling 1,000 emails...\n");

  // Fetch or create dev user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("❌ No user found in database. Run 'pnpm db:seed' first.");
    process.exit(1);
  }

  // Fetch sender
  const sender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (!sender) {
    console.error("❌ No sender found in database. Run 'pnpm db:seed' first.");
    process.exit(1);
  }

  // Generate 1000 recipient emails
  console.log("Generating 1,000 recipient addresses...");
  const recipients = Array.from(
    { length: 1000 },
    (_, i) => `loadtest.user.${i + 1}@reachinbox-demo.local`
  );

  const startTime = new Date(Date.now() + 5000).toISOString(); // 5s from now
  const delayMs = 1000; // 1 sec delay between emails
  const hourlyLimit = 100; // 100 per hour (spans 10 hours)

  const startMs = Date.now();

  console.log("Enqueueing 1,000 jobs into PostgreSQL & BullMQ queue...");
  const result = await scheduleEmails(user.id, {
    subject: "Load Test Email — High Volume Queue",
    body: "<p>This is an automated load test email sent via ReachInbox.</p>",
    recipients,
    startTime,
    delayMs,
    hourlyLimit,
    senderId: sender.id,
  });

  const elapsedMs = Date.now() - startMs;

  console.log("\n=======================================================");
  console.log(` ✅ SUCCESS: Scheduled ${result.scheduled} emails!`);
  console.log(` ⏱️ Time taken: ${elapsedMs} ms (${(elapsedMs / 1000).toFixed(2)} seconds)`);
  console.log(` 🆔 Batch ID: ${result.batchId}`);
  console.log("=======================================================\n");

  // Fetch queue stats
  const stats = await getQueueStats();
  console.log("📊 Current BullMQ Queue State in Redis:");
  console.log(` • Waiting:  ${stats.waiting}`);
  console.log(` • Delayed:  ${stats.delayed}`);
  console.log(` • Active:   ${stats.active}`);
  console.log(` • Failed:   ${stats.failed}`);
  console.log(` • Total:    ${stats.waiting + stats.delayed + stats.active}\n`);

  console.log("ℹ️  Note: Ethereal SMTP is a test service and rate-limits heavy traffic.");
  console.log("   The worker process will process these delayed jobs safely according to sender rate limits.\n");
}

runLoadTest()
  .catch((err) => {
    console.error("❌ Load test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
