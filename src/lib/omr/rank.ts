// The rank list of a shared exam. Pure and deterministic: highest score first, equal
// scores share a rank (1, 2, 2, 4), and within a tie the lower register number is listed
// first. Time taken never breaks a tie: the hall doesn't either.

import { compare, type Fraction } from "./fraction";

export type Ranked<T> = T & { rank: number };

export function rankList<T extends { score: Fraction; registerNo: number }>(
  rows: readonly T[],
): Ranked<T>[] {
  const sorted = [...rows].sort(
    (a, b) => compare(b.score, a.score) || a.registerNo - b.registerNo,
  );
  let rank = 0;
  return sorted.map((row, i) => {
    if (i === 0 || compare(row.score, sorted[i - 1]!.score) !== 0) rank = i + 1;
    return { ...row, rank };
  });
}
