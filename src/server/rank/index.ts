import "server-only";

import { rankStore } from "./rank-store";

/** Counts new XP on this week's board, which the squad rank reads. */
export async function recordXp(userId: string, amount: number, day: string) {
  await rankStore.add(userId, amount, day);
}
