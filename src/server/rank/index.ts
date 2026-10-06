import "server-only";

import { rankRepository } from "@/server/repositories/rank-repository";

import { rankStore } from "./rank-store";

/** Counts new XP on the user's boards: global, and each exam they're planning for. */
export async function recordXp(userId: string, amount: number, day: string) {
  const exams = (await rankRepository.examsOf([userId])).get(userId) ?? [];
  await rankStore.add(
    userId,
    amount,
    day,
    exams.map((e) => e.id),
  );
}
