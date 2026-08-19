/**
 * Distributed rate limiter for per-sender hourly email limits.
 *
 * WHY REDIS-BACKED?
 * A simple in-memory counter fails when multiple worker processes run
 * simultaneously — each would have its own counter and the combined
 * send rate could exceed the limit.
 *
 * Redis counters are shared across all worker instances. We use an
 * atomic Lua script to increment + check atomically, preventing
 * race conditions between concurrent workers.
 *
 * Key format: email-rate:{senderId}:{hourWindow}
 * Example:    email-rate:uuid-123:2026081910  (Aug 19, 2026, 10 AM UTC)
 *
 * The key automatically expires after 2 hours (1 hour margin),
 * so we never accumulate stale keys.
 */

import { getRedisConnection } from "../utils/redis.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const RATE_LIMIT_KEY_PREFIX = "email-rate";
const WINDOW_TTL_SECONDS = 7200; // 2 hours (1 hour + buffer)

/**
 * Returns the current hour window as a string: YYYYMMDDHHH
 * Example: 2026081910 for Aug 19, 2026 at 10:xx UTC
 */
export function getHourWindow(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}${mo}${d}${h}`;
}

function getRateLimitKey(senderId: string, hourWindow: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}:${senderId}:${hourWindow}`;
}

/**
 * Atomic Lua script: increment counter and check against limit.
 * Returns the new count after increment.
 *
 * Using Lua ensures the increment + check + expire is atomic —
 * no two workers can race between the read and write.
 */
const incrementLuaScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
  current = 0
else
  current = tonumber(current)
end

if current >= limit then
  return -1
end

local newCount = redis.call('INCR', key)
if newCount == 1 then
  redis.call('EXPIRE', key, ttl)
end
return newCount
`;

/**
 * Attempts to acquire a send slot for the given sender in the current hour window.
 *
 * Returns:
 *  - { allowed: true, count } if the sender can send
 *  - { allowed: false } if the hourly limit is reached
 */
export async function tryAcquireRateLimit(
  senderId: string,
  scheduledAt: Date = new Date()
): Promise<{ allowed: boolean; count?: number }> {
  const redis = getRedisConnection();
  const hourWindow = getHourWindow(scheduledAt);
  const key = getRateLimitKey(senderId, hourWindow);
  const limit = config.worker.maxEmailsPerHourPerSender;

  try {
    const result = (await redis.eval(
      incrementLuaScript,
      1,
      key,
      String(limit),
      String(WINDOW_TTL_SECONDS)
    )) as number;

    if (result === -1) {
      logger.warn(
        { senderId, hourWindow, limit },
        "Rate limit reached — email will be rescheduled"
      );
      return { allowed: false };
    }

    return { allowed: true, count: result };
  } catch (err) {
    logger.error({ err, senderId, key }, "Rate limit check failed");
    // Fail open — allow the send if Redis is unavailable
    // Log the incident for monitoring
    return { allowed: true, count: -1 };
  }
}

/**
 * Gets the current count for a sender in the current hour window.
 * Used for observability.
 */
export async function getRateLimitCount(
  senderId: string,
  date: Date = new Date()
): Promise<number> {
  const redis = getRedisConnection();
  const hourWindow = getHourWindow(date);
  const key = getRateLimitKey(senderId, hourWindow);

  try {
    const value = await redis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Computes the timestamp for the start of the next hour window.
 * Used to reschedule emails when the rate limit is reached.
 */
export function getNextHourWindowStart(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}
