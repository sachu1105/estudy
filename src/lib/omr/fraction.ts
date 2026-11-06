// Exact marks. A paper takes a third of a mark off for a wrong answer, and 0.33 would
// cost 30 wrong answers 9.9 marks instead of 10. Pure, shared by the server and the page.

/** A fraction in lowest terms with a positive denominator. */
export type Fraction = { n: number; d: number };

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

export function frac(n: number, d = 1): Fraction {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0)
    throw new RangeError(`Not a fraction: ${n}/${d}`);
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (sign * n) / g + 0, d: Math.abs(d) / g };
}

export const ZERO = frac(0);

export const add = (a: Fraction, b: Fraction) =>
  frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Fraction, b: Fraction) =>
  frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const times = (a: Fraction, k: number) => frac(a.n * k, a.d);
export const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
export const div = (a: Fraction, b: Fraction) => frac(a.n * b.d, a.d * b.n);
/** Negative, zero or positive as a is below, at or above b. */
export const compare = (a: Fraction, b: Fraction) =>
  Math.sign(a.n * b.d - b.n * a.d);
export const toNumber = (f: Fraction) => f.n / f.d;

/** A score as people read it: 62.67, 62.5, 62. Rounded half away from zero. */
export function formatScore(f: Fraction) {
  const hundredths = Math.round(Math.abs(f.n * 100) / f.d) * Math.sign(f.n);
  const text = (Math.abs(hundredths) / 100).toFixed(2).replace(/\.?0+$/, "");
  return hundredths < 0 ? `−${text}` : text;
}

/** A marking rule as people write it: 1, 0.25, 1/3. */
export function formatRule(f: Fraction) {
  if (f.d === 1) return String(f.n);
  // Tenths, hundredths and thousandths read better as decimals.
  for (const scale of [10, 100, 1000])
    if (scale % f.d === 0) return String(f.n / f.d);
  return `${f.n}/${f.d}`;
}

/** The largest number a mark, penalty or cut-off may be. */
export const MAX_MARK = 1000;

/**
 * What a person typed for a mark: "1", "0.25", ".5" or "1/3". Null when it isn't a
 * number from 0 to MAX_MARK with up to three decimals or a denominator up to 100.
 */
export function parseFraction(text: string): Fraction | null {
  const t = text.trim();
  const ratio = /^(\d{1,4})\s*\/\s*(\d{1,3})$/.exec(t);
  let f: Fraction | null = null;
  if (ratio) {
    const d = Number(ratio[2]);
    if (d < 1 || d > 100) return null;
    f = frac(Number(ratio[1]), d);
  } else {
    const decimal = /^(\d{0,4})(?:\.(\d{1,3}))?$/.exec(t);
    if (!decimal || (decimal[1] === "" && decimal[2] === undefined))
      return null;
    const places = decimal[2] ?? "";
    f = frac(Number(`${decimal[1] || "0"}${places}`), 10 ** places.length);
  }
  return compare(f, frac(MAX_MARK)) > 0 ? null : f;
}
