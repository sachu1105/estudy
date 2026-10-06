import "server-only";

import { rankKey, type RankPeriod } from "@/lib/progress/rank-keys";
import { redis } from "@/server/redis";

/** Week and month boards are kept a while for "last week", then expire. */
const PERIOD_TTL_SECONDS = 70 * 86_400;
const PERIODS: RankPeriod[] = ["week", "month", "all"];
/** Tests share Redis with the dev server: their boards live apart. */
const PREFIX = process.env.VITEST ? "test:" : "";
const k = (key: string) => PREFIX + key;

/**
 * Leaderboards as Redis sorted sets (milestone 12). A cache: every board can be rebuilt
 * from the XP log in Postgres at any time (rule 6), and is, nightly.
 */
export const rankStore = {
  /** Counts XP on the global boards and the user's exam boards. */
  async add(userId: string, amount: number, day: string, examIds: string[]) {
    if (amount === 0) return;
    const multi = redis.multi();
    for (const examId of [null, ...examIds])
      for (const period of PERIODS) {
        const key = k(rankKey(period, day, examId));
        multi.zincrby(key, amount, userId);
        if (period !== "all") multi.expire(key, PERIOD_TTL_SECONDS);
      }
    await multi.exec();
  },

  /** Highest first: [userId, xp] pairs. */
  async top(key: string, count: number) {
    const flat = await redis.zrevrange(k(key), 0, count - 1, "WITHSCORES");
    const rows: { userId: string; xp: number }[] = [];
    for (let i = 0; i < flat.length; i += 2)
      rows.push({ userId: flat[i]!, xp: Math.round(Number(flat[i + 1])) });
    return rows;
  },

  async position(key: string, userId: string) {
    const [rank, score] = await Promise.all([
      redis.zrevrank(k(key), userId),
      redis.zscore(k(key), userId),
    ]);
    return rank === null
      ? null
      : { rank: rank + 1, xp: Math.round(Number(score)) };
  },

  /** Replaces one board wholesale (the nightly rebuild). */
  async replace(
    key: string,
    rows: { userId: string; xp: number }[],
    expires: boolean,
  ) {
    const temp = `${k(key)}:rebuild`;
    const multi = redis.multi().del(temp);
    const positive = rows.filter((r) => r.xp > 0);
    for (let i = 0; i < positive.length; i += 500)
      multi.zadd(
        temp,
        ...positive.slice(i, i + 500).flatMap((r) => [r.xp, r.userId]),
      );
    if (positive.length > 0) multi.rename(temp, k(key));
    else multi.del(k(key));
    if (expires && positive.length > 0)
      multi.expire(k(key), PERIOD_TTL_SECONDS);
    await multi.exec();
  },
};
