// Levels from XP: each level costs 50 more than the last (100, 150, 200...), so early
// levels come quickly and later ones mean steady work.

export const FIRST_LEVEL_XP = 100;
export const LEVEL_STEP_XP = 50;

export function levelOf(xp: number) {
  let level = 1;
  let floor = 0;
  let size = FIRST_LEVEL_XP;
  while (xp >= floor + size) {
    floor += size;
    level++;
    size += LEVEL_STEP_XP;
  }
  return { level, intoLevel: Math.max(0, xp - floor), levelSize: size };
}
