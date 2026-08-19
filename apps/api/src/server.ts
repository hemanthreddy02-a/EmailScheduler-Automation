/**
 * Server entry point.
 *
 * Starts the Express server after validating database and Redis connectivity.
 */

import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./db/prisma.js";
import { getRedisConnection } from "./utils/redis.js";

async function main() {
  logger.info("Starting ReachInbox API server...");

  // Verify database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection OK");
  } catch (err) {
    logger.error({ err }, "Database connection failed — exiting");
    process.exit(1);
  }

  // Verify Redis connectivity
  try {
    const redis = getRedisConnection();
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error("Redis ping failed");
    logger.info("Redis connection OK");
  } catch (err) {
    logger.error({ err }, "Redis connection failed — exiting");
    process.exit(1);
  }

  const app = await createApp();

  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.nodeEnv,
        frontendUrl: config.frontendUrl,
      },
      `API server started on port ${config.port}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Server shut down gracefully");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Server startup failed");
  process.exit(1);
});
