/**
 * Worker entry point.
 *
 * This is a SEPARATE PROCESS from the API server.
 * Run with: pnpm dev:worker
 *
 * Architecture benefit: API instances and worker instances can be
 * scaled independently. Multiple workers can run simultaneously —
 * BullMQ + Redis coordinate job assignment, and our Redis rate limiter
 * prevents exceeding per-sender limits.
 */

import "../config/index.js"; // Load and validate config first
import { createEmailWorker } from "./emailWorker.js";
import { logger } from "../utils/logger.js";
import { prisma } from "../db/prisma.js";
import { getRedisConnection } from "../utils/redis.js";

async function main() {
  logger.info("Starting ReachInbox email worker...");

  // Verify database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Worker: database connection OK");
  } catch (err) {
    logger.error({ err }, "Worker: database connection failed — exiting");
    process.exit(1);
  }

  // Verify Redis connection
  try {
    const redis = getRedisConnection();
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error("Redis ping failed");
    logger.info("Worker: Redis connection OK");
  } catch (err) {
    logger.error({ err }, "Worker: Redis connection failed — exiting");
    process.exit(1);
  }

  const worker = createEmailWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Worker: shutdown signal received");
    await worker.close();
    await prisma.$disconnect();
    logger.info("Worker: graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("Worker: ready and waiting for jobs");
}

main().catch((err) => {
  logger.error({ err }, "Worker: startup failed");
  process.exit(1);
});
