import "server-only";

import { weekKey } from "@/lib/progress/rank-keys";
import { redis } from "@/server/redis";

/** Weekly boards are kept a while, then expire. */
const TTL_SECONDS = 70 * 86_400;
/** Tests share Redis with the dev server: their boards live apart. */
const PREFIX = process.env.VITEST ? "test:" : "";
const k = (key: string) => PREFIX + key;

/**
 * This week's XP per user as a Redis sorted set, which the squad rank reads. A cache:
 * it can be rebuilt from the XP log in Postgres at any time (rule 6), and is, nightly.
 */
export const rankStore = {
  async add(userId: string, amount: number, day: string) {
    if (amount === 0) return;
    const key = k(weekKey(day));
    await redis
      .multi()
      .zincrby(key, amount, userId)
      .expire(key, TTL_SECONDS)
      .exec();
  },

  /** This week's XP of these users (a squad's members). */
  async scores(day: string, userIds: string[]) {
    if (userIds.length === 0) return new Map<string, number>();
    const values = await redis.zmscore(k(weekKey(day)), ...userIds);
    return new Map(
      userIds.map((id, i) => [id, Math.round(Number(values[i] ?? 0))]),
    );
  },

  /** Replaces the week's board wholesale (the nightly rebuild). */
  async replace(day: string, rows: { userId: string; xp: number }[]) {
    const key = k(weekKey(day));
    const temp = `${key}:rebuild`;
    const multi = redis.multi().del(temp);
    const positive = rows.filter((r) => r.xp > 0);
    for (let i = 0; i < positive.length; i += 500)
      multi.zadd(
        temp,
        ...positive.slice(i, i + 500).flatMap((r) => [r.xp, r.userId]),
      );
    if (positive.length > 0) multi.rename(temp, key).expire(key, TTL_SECONDS);
    else multi.del(key);
    await multi.exec();
  },
};
