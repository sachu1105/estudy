/** Cleans extracted text: unix newlines, no control characters, no runs of blank lines. */
export function normaliseText(raw: string) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits text into chunks of at most `maxChars`, breaking at blank lines, then lines, and
 * only mid-line when a single line is longer than a chunk. Deterministic.
 */
export function chunkText(text: string, maxChars = 6000): string[] {
  const pieces: string[] = [];
  for (const line of text.split("\n")) {
    if (line.length <= maxChars) pieces.push(line);
    else
      for (let i = 0; i < line.length; i += maxChars)
        pieces.push(line.slice(i, i + maxChars));
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const next = current ? `${current}\n${piece}` : piece;
    if (next.length > maxChars && current) {
      chunks.push(current.trim());
      current = piece;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}
