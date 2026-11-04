// Friendships and direct chats are stored once per pair, the smaller id first, so the
// same two people can never have two rows. Pure: shared by services and tests.

export type Pair = { userAId: string; userBId: string };

export function pairOf(a: string, b: string): Pair {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/** The other person in a pair. */
export function otherOf(pair: Pair, me: string) {
  return pair.userAId === me ? pair.userBId : pair.userAId;
}

/** Which side of the pair someone is: their read marker lives on that side. */
export const sideOf = (pair: Pair, me: string) =>
  pair.userAId === me ? ("A" as const) : ("B" as const);

export const NOTE_MAX = 120;
export const DM_MAX = 2000;
