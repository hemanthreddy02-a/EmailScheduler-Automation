import { Router } from "express";
import { checkDatabaseHealth } from "../db/prisma.js";
import { checkRedisHealth } from "../utils/redis.js";
import { getQueueStats } from "../queues/emailQueue.js";

const router: Router = Router();

/**
 * GET /health
 * Returns system health status for monitoring.
 */
router.get("/", async (_req, res) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  let queueStats = null;
  try {
    queueStats = await getQueueStats();
  } catch {
    // Queue stats are best-effort
  }

  const status =
    dbHealthy && redisHealthy ? "ok" : "degraded";

  res.status(status === "ok" ? 200 : 503).json({
    status,
    database: dbHealthy ? "connected" : "disconnected",
    redis: redisHealthy ? "connected" : "disconnected",
    queue: queueStats,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
