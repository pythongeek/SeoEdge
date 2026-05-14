/**
 * Rate limiting with Upstash Redis
 * - Sliding window for API routes
 * - Token bucket for AI features
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Lazy Redis Connection ────────────────────────────────────────────

let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      // Return a mock Redis for build time
      return new Redis({ url: "https://mock.upstash.io", token: "mock" });
    }
    redisInstance = new Redis({ url, token });
  }
  return redisInstance;
}

// ─── Rate Limiters ──────────────────────────────────────────────────

function createLimiter(prefix: string, maxRequests: number, window: string) {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(maxRequests, window as `${number} ${"s" | "m" | "h" | "d"}`),
    analytics: true,
    prefix: `seomaster:ratelimit:${prefix}`,
  });
}

export const apiLimiter = createLimiter("api", 100, "1m");
export const aiLimiter = createLimiter("ai", 20, "1m");
export const exportLimiter = createLimiter("export", 10, "1h");
export const externalApiLimiter = createLimiter("external", 1000, "1h");
export const gscLimiter = createLimiter("gsc", 600, "1m");

// ─── Token Bucket for AI Credits ────────────────────────────────────

export async function checkAiCredits(
  workspaceId: number,
  required: number = 1
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `seomaster:credits:${workspaceId}`;
  const now = Date.now();
  const redis = getRedis();

  const [tokens, resetAt] = await redis.hmget(key, "tokens", "resetAt") as [string | null, string | null];
  const resetTime = resetAt ? parseInt(resetAt) : 0;

  if (!tokens || now > resetTime) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);

    await redis.hmset(key, {
      tokens: String(10000 * required),
      resetAt: String(nextMonth.getTime()),
    });

    return { allowed: true, remaining: 10000 * required, reset: nextMonth.getTime() };
  }

  const remaining = parseInt(tokens);
  if (remaining < required) {
    return { allowed: false, remaining, reset: resetTime };
  }

  await redis.hincrby(key, "tokens", -required);
  return { allowed: true, remaining: remaining - required, reset: resetTime };
}

// ─── Rate Limit Response Helper ─────────────────────────────────────

export function rateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(reset),
  };
}
