import { today as todayIn, type Clock } from "@/lib/clock";
import { weekStart } from "@/lib/progress/rank-keys";
import type { RankRepository } from "@/server/repositories/rank-repository";

/** Board days count in India time, where the users are. */
const TZ = "Asia/Kolkata";

type Store = {
  replace(day: string, rows: { userId: string; xp: number }[]): Promise<void>;
};

/** Keeps the squad rank's weekly XP board honest: rebuilt from Postgres nightly. */
export function createRankService(deps: {
  ranks: RankRepository;
  store: Store;
  clock: Clock;
}) {
  return {
    /** Rebuilds this week's board from the XP log. Returns how many users it holds. */
    async rebuild() {
      const day = todayIn(deps.clock, TZ);
      const rows = await deps.ranks.xpSums(weekStart(day));
      await deps.store.replace(day, rows);
      return rows.length;
    },
  };
}

export type RankService = ReturnType<typeof createRankService>;
