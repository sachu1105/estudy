/**
 * A Postgres tsquery from what the user typed: each word a prefix match, all required.
 * Only letters, marks and digits survive, so nothing typed can break the query syntax.
 * Malayalam works word by word with the 'simple' configuration.
 */
export function toPrefixQuery(text: string) {
  const words = text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((w) => w.length > 0)
    .slice(0, 8);
  return words.length ? words.map((w) => `${w}:*`).join(" & ") : null;
}
