// Near-duplicate detection for syllabuses. Many Kerala PSC posts share a syllabus word for
// word, or nearly so; a new upload that matches one already parsed reuses it with no AI call.
//
// MinHash over word 5-shingles: the share of equal slots between two signatures estimates
// the Jaccard similarity of their shingle sets. Deterministic (fixed seeds, FNV hashing).

const SIZE = 64;
const SHINGLE = 5;
/** Two syllabuses this similar are treated as the same one. */
export const SAME_SYLLABUS = 0.9;

function fnv1a(text: string, seed: number) {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function words(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** 64 numbers summarising the text's wording. Empty for very short texts. */
export function minhash(text: string): number[] {
  const w = words(text);
  if (w.length < SHINGLE) return [];
  const shingles = new Set<string>();
  for (let i = 0; i + SHINGLE <= w.length; i++)
    shingles.add(w.slice(i, i + SHINGLE).join(" "));
  const signature = new Array<number>(SIZE).fill(0xffffffff);
  for (const shingle of shingles) {
    for (let k = 0; k < SIZE; k++) {
      const h = fnv1a(shingle, k * 0x9e3779b1);
      if (h < signature[k]) signature[k] = h;
    }
  }
  // Stored in Postgres int4[]: shift into the signed range.
  return signature.map((h) => h - 0x80000000);
}

export function similarity(a: number[], b: number[]) {
  if (a.length !== SIZE || b.length !== SIZE) return 0;
  let same = 0;
  for (let k = 0; k < SIZE; k++) if (a[k] === b[k]) same++;
  return same / SIZE;
}

/**
 * The post a syllabus is for, from its heading ("DETAILED SYLLABUS FOR THE POST OF LD CLERK"),
 * normalised, or null. Shown to the user when a match is reused.
 */
export function postOf(text: string): string | null {
  const head = text.split("\n").slice(0, 8).join(" ");
  const m =
    /syllabus\s+for\s+(?:the\s+)?(?:post\s+of\s+)?(.{3,120}?)(?:\s{2,}|$|distribution|part\s+i\b)/i.exec(
      head,
    );
  return m
    ? m[1]
        .replace(/\s+/g, " ")
        .replace(/[\s,.:-]+$/, "")
        .trim()
    : null;
}
