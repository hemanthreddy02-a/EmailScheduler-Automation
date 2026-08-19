/**
 * Shared Redis connection using ioredis.
 *
 * We use ioredis directly for two purposes:
 *  1. BullMQ queue/worker connections (requires ioredis-compatible interface)
 *  2. Direct Redis operations (rate limiting, health checks)
 *
 * BullMQ requires separate connection instances per queue/worker
 * (it calls .duplicate() internally). We export a factory here.
 */

import { Redis } from "ioredis";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export type RedisClient = Redis;

// Shared connection for direct Redis operations (health checks, rate limits)
let sharedRedis: RedisClient | null = null;

export function getRedisConnection(): RedisClient {
  if (!sharedRedis) {
    sharedRedis = createRedisClient("shared");
  }
  return sharedRedis;
}

/**
 * Creates a new ioredis client.
 * BullMQ requires a fresh client per Queue/Worker — do not reuse.
 */
export function createRedisClient(name = "client"): RedisClient {
  const client = new Redis(config.redis.url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    lazyConnect: true,
  });

  client.on("connect", () => {
    logger.info({ client: name }, "Redis connected");
  });

  client.on("error", (err: unknown) => {
    logger.error({ client: name, err }, "Redis connection error");
  });

  client.on("close", () => {
    logger.warn({ client: name }, "Redis connection closed");
  });

  return client;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
