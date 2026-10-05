import { randomUUID } from "node:crypto";

import type { Redis } from "ioredis";

import type { Clock } from "@/lib/clock";

export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterMs: number };

/**
 * Sliding-window log in a Redis sorted set: one member per attempt, scored by time.
 * Blocked attempts are recorded too, so hammering keeps the window closed.
 */
export async function hit(
  redis: Redis,
  clock: Clock,
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const now = clock.now().getTime();
  const redisKey = `rl:${key}`;
  const results = await redis
    .multi()
    .zremrangebyscore(redisKey, 0, now - rule.windowMs)
    .zadd(redisKey, now, `${now}:${randomUUID()}`)
    .zcard(redisKey)
    .zrange(redisKey, "0", "0", "WITHSCORES")
    .pexpire(redisKey, rule.windowMs)
    .exec();

  const count = Number(results?.[2]?.[1] ?? 0);
  if (count <= rule.limit) return { ok: true };

  const oldest = Number(
    (results?.[3]?.[1] as string[] | undefined)?.[1] ?? now,
  );
  return { ok: false, retryAfterMs: Math.max(0, oldest + rule.windowMs - now) };
}
