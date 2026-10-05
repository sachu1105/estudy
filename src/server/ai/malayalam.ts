// Many Kerala PSC PDFs set Malayalam in fonts whose text layer comes out in visual order:
// a vowel sign drawn left of its consonant (േ in കേ) is written before it, the ാ glyph
// reads as ോ, and conjuncts lose letters (ചരിത്രം -> ചരിതം). Valid Unicode never starts a
// word with a vowel sign, which makes the damage easy to detect. The order and the ാ glyph
// can be repaired; lost conjunct letters can't, so the user is told to check names.

const CONSONANT = "ക-ഹ";
const PRE_BASE = "െേൈ"; // െ േ ൈ
const LETTERS = /[അ-ഹൠ-ൡൺ-ൿ]/g;
/** A pre-base vowel sign with no consonant before it: impossible in logical order. */
const STRAY = new RegExp(`(?<![${CONSONANT}\\u0D4D\\u200D])[${PRE_BASE}]`, "g");

export type MalayalamCheck = {
  /** Malayalam came out in visual order (or worse); names need checking. */
  garbled: boolean;
  /** Stray vowel signs per 1,000 Malayalam letters. */
  strayPerThousand: number;
};

export function checkMalayalam(text: string): MalayalamCheck {
  const letters = text.match(LETTERS)?.length ?? 0;
  const stray = text.match(STRAY)?.length ?? 0;
  const strayPerThousand = letters ? Math.round((stray * 1000) / letters) : 0;
  return { garbled: stray >= 3 && strayPerThousand >= 5, strayPerThousand };
}

/**
 * Best-effort repair. A wholly visual-order text (many stray signs) gets every rule; a
 * text that is mostly fine gets only the safe one, moving word-initial vowel signs.
 */
export function repairMalayalam(text: string): string {
  const { garbled, strayPerThousand } = checkMalayalam(text);
  if (!garbled) return text;
  const moveStray = (s: string) =>
    s.replace(
      new RegExp(`${STRAY.source}([${CONSONANT}])`, "g"),
      (_m, ...groups) => {
        const consonant = groups[0] as string;
        return `${consonant}${_m[0]}`;
      },
    );
  if (strayPerThousand < 20) return moveStray(text);

  const O_MARK = ""; // keeps a repaired ോ away from the ാ rule below
  return (
    text
      // േ C ോ  ->  C ോ   (ോ is drawn േ + C + ാ, and this font's ാ reads as ോ)
      .replace(new RegExp(`േ([${CONSONANT}])ോ`, "g"), `$1${O_MARK}`)
      // െ C ോ  ->  C ൊ
      .replace(new RegExp(`െ([${CONSONANT}])ോ`, "g"), "$1ൊ")
      // what's left of ോ is the misread ാ
      .replace(/ോ/g, "ാ")
      .replace(new RegExp(O_MARK, "g"), "ോ")
      // every remaining pre-base sign belongs after the consonant that follows it
      .replace(new RegExp(`([${PRE_BASE}])([${CONSONANT}])`, "g"), "$2$1")
  );
}
