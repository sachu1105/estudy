// Every duration rule in one place. Integer arithmetic only, so output is identical on every
// machine: multipliers are percentages, and rounding goes to the nearest 5 minutes.

export type Intensity = "LIGHT" | "STEADY" | "INTENSE";
export type Confidence = 1 | 2 | 3 | 4 | 5;

export const INTENSITY_PCT: Record<Intensity, number> = {
  LIGHT: 75,
  STEADY: 100,
  INTENSE: 130,
};
export const CONFIDENCE_PCT: Record<Confidence, number> = {
  1: 160,
  2: 130,
  3: 100,
  4: 70,
  5: 50,
};

export const CHECK_TEST_MINUTES = 10;
export const SECTION_MOCK_MINUTES = 30;
export const FULL_MOCK_MINUTES = 75; // PSC style: 100 questions in 75 minutes
export const MIN_BLOCK = 15;
export const MAX_BLOCK = 60;
export const BEGINNER_BLOCK = 25;
export const BEGINNER_DAYS = 7;
export const BUFFER_PCT = 10;
export const REVIEW_PCT = 15;

/** Nearest multiple of 5 of numerator / denominator, without floating point. */
export function round5(numerator: number, denominator = 1) {
  return Math.floor((2 * numerator + 5 * denominator) / (10 * denominator)) * 5;
}

export function floor5(minutes: number) {
  return Math.floor(minutes / 5) * 5;
}

/** Base study time before multipliers: 30 min for weight 1 / difficulty 1, up to 110. */
export function baseMinutes(weight: number, difficulty: number) {
  return 30 + 12 * (weight - 1) + 8 * (difficulty - 1);
}

export function studyMinutes(
  weight: number,
  difficulty: number,
  intensity: Intensity,
  confidence: Confidence,
) {
  const numerator =
    baseMinutes(weight, difficulty) *
    INTENSITY_PCT[intensity] *
    CONFIDENCE_PCT[confidence];
  return Math.max(MIN_BLOCK, round5(numerator, 10_000));
}

export function revisionMinutes(study: number) {
  return Math.max(10, round5(study * 20, 100));
}

/**
 * Spaced revision: days after the topic is studied. Confidence 1-2 gets a 4th, earlier touch.
 * A weak check test (< 60%) adds one more touch between the 3rd and 10th day.
 */
export function revisionOffsets(
  confidence: Confidence,
  extraRevision: boolean,
) {
  const offsets = confidence <= 2 ? [1, 3, 10, 30] : [3, 10, 30];
  if (extraRevision) offsets.push(6);
  return [...new Set(offsets)].sort((a, b) => a - b);
}

/** Minutes the plan may use on a day: the user's minutes minus the 10% buffer. */
export function dayCapacity(minutes: number) {
  return Math.floor((minutes * (100 - BUFFER_PCT)) / 100);
}

/** Days at the end of the horizon reserved for revision and full mocks (15%, rounded). */
export function reviewDayCount(horizonDays: number) {
  return Math.floor((horizonDays * REVIEW_PCT + 50) / 100);
}

export function clampConfidence(value: number): Confidence {
  return Math.min(5, Math.max(1, Math.round(value))) as Confidence;
}
