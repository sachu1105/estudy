import { today as todayIn, toLocalDate, type Clock } from "@/lib/clock";
import { addDays } from "@/lib/plan-engine";
import { rankKey, weekStart, type RankPeriod } from "@/lib/progress/rank-keys";
import { computeStreak, STREAK_MINUTES } from "@/lib/progress/streak";
import type { RankRepository } from "@/server/repositories/rank-repository";

export const TOP = 100;
/** With a district filter, boards are filtered from this many leaders (fine at launch scale). */
const DISTRICT_POOL = 2000;
/** Faster than a person could (milestone 12): flagged for an admin to look at. */
export const ABUSE_LIMITS = { maxXp: 900, maxTests: 40, maxMinutes: 900 };
/** Rank days count in India time, where the users are. */
const TZ = "Asia/Kolkata";

type Store = {
  add(
    userId: string,
    amount: number,
    day: string,
    examIds: string[],
  ): Promise<void>;
  top(key: string, count: number): Promise<{ userId: string; xp: number }[]>;
  position(
    key: string,
    userId: string,
  ): Promise<{ rank: number; xp: number } | null>;
  replace(
    key: string,
    rows: { userId: string; xp: number }[],
    expires: boolean,
  ): Promise<void>;
};

/** Global and exam leaderboards, built from XP (milestone 12). */
export function createRankService(deps: {
  ranks: RankRepository;
  store: Store;
  clock: Clock;
}) {
  const today = () => todayIn(deps.clock, TZ);

  return {
    /** Rebuilds this week's, this month's and all-time boards from Postgres. */
    async rebuild() {
      const day = today();
      const sums = {
        all: await deps.ranks.xpSums(),
        week: await deps.ranks.xpSums(weekStart(day)),
        month: await deps.ranks.xpSums(`${day.slice(0, 7)}-01`),
      };
      const exams = await deps.ranks.examsOf(sums.all.map((r) => r.userId));
      const examIds = new Set([...exams.values()].flat().map((e) => e.id));
      for (const period of ["all", "week", "month"] as RankPeriod[]) {
        const rows = sums[period];
        await deps.store.replace(rankKey(period, day), rows, period !== "all");
        for (const examId of examIds)
          await deps.store.replace(
            rankKey(period, day, examId),
            rows.filter((r) =>
              exams.get(r.userId)?.some((e) => e.id === examId),
            ),
            period !== "all",
          );
      }
      return sums.all.length;
    },

    /**
     * A board: the top 100 with names, exams and streaks, and the viewer's own place even
     * outside it. Hidden users show as "Anonymous aspirant"; emails never appear.
     */
    async board(
      viewer: { id: string },
      filters: {
        period: RankPeriod;
        examId?: string | null;
        district?: string | null;
      },
    ) {
      const day = today();
      const key = rankKey(filters.period, day, filters.examId);
      let rows = await deps.store.top(
        key,
        filters.district ? DISTRICT_POOL : TOP,
      );
      let me = await deps.store.position(key, viewer.id);
      if (filters.district) {
        const inside = await deps.ranks.inDistrict(
          rows.map((r) => r.userId),
          filters.district,
        );
        rows = rows.filter((r) => inside.has(r.userId));
        const index = rows.findIndex((r) => r.userId === viewer.id);
        me = index >= 0 ? { rank: index + 1, xp: rows[index]!.xp } : null;
        rows = rows.slice(0, TOP);
      }
      const ids = [...new Set([...rows.map((r) => r.userId), viewer.id])];
      const [users, exams, active] = await Promise.all([
        deps.ranks.users(ids),
        deps.ranks.examsOf(ids),
        deps.ranks.activeDaysMany(ids, addDays(day, -120), STREAK_MINUTES),
      ]);
      const byId = new Map(users.map((u) => [u.id, u]));
      const describe = (userId: string, xp: number, rank: number) => {
        const u = byId.get(userId);
        const reset = u?.streakResetAt
          ? toLocalDate(u.streakResetAt, u.timezone)
          : null;
        const days = (active.get(userId) ?? []).filter(
          (d) => !reset || d >= reset,
        );
        const hidden = (u?.hideFromGlobalRank ?? false) && userId !== viewer.id;
        return {
          rank,
          xp,
          you: userId === viewer.id,
          name: hidden ? "Anonymous aspirant" : (u?.displayName ?? "Aspirant"),
          avatarUrl: hidden ? null : (u?.avatarUrl ?? null),
          exam: exams.get(userId)?.[0]?.name ?? null,
          streak: computeStreak(days, day).current,
        };
      };
      const list = rows.map((r, i) => describe(r.userId, r.xp, i + 1));
      return {
        rows: list,
        me:
          me && me.rank > list.length
            ? describe(viewer.id, me.xp, me.rank)
            : null,
        ranked: me !== null,
      };
    },

    /** Exams the viewer can filter by: the ones they're planning for. */
    async examsFor(userId: string) {
      return (await deps.ranks.examsOf([userId])).get(userId) ?? [];
    },

    flagged: () => deps.ranks.flagged(addDays(today(), -14), ABUSE_LIMITS),
  };
}

export type RankService = ReturnType<typeof createRankService>;
