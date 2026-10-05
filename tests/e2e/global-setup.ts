import { Redis } from "ioredis";

/** Clears rate-limit counters so repeated local runs don't lock themselves out. */
export default async function globalSetup() {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  const keys = await redis.keys("rl:*");
  if (keys.length) await redis.del(...keys);
  redis.disconnect();
}
