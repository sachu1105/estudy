import { normaliseText } from "@/server/ai/chunk";

export type SourceKind = "PDF" | "DOCX" | "IMAGE" | "TEXT";

/** Reads images. The real one (Tesseract, then a hosted vision model) lands in milestone 7.5. */
export interface OcrProvider {
  recognize(bytes: Uint8Array): Promise<string>;
}

/** A failure the user can act on. Never retried: the same file would fail the same way. */
export class ParseInputError extends Error {
  override name = "ParseInputError";
}

export const unavailableOcr: OcrProvider = {
  async recognize() {
    throw new ParseInputError(
      "Reading syllabuses from photos isn't available yet. Upload the PDF or paste the text instead.",
    );
  },
};

export const MAX_TEXT_CHARS = 150_000;
const MIN_TEXT_CHARS = 40;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);

function containsAscii(bytes: Uint8Array, needle: string) {
  const target = new TextEncoder().encode(needle);
  outer: for (let i = 0; i <= bytes.length - target.length; i++) {
    for (let j = 0; j < target.length; j++)
      if (bytes[i + j] !== target[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * What a file really is, from its first bytes, never from its name or declared type.
 * Anything else (HTML, SVG, executables, other zips) is rejected.
 */
export function sniffKind(
  bytes: Uint8Array,
): Exclude<SourceKind, "TEXT"> | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "PDF"; // %PDF-
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]))
    return containsAscii(bytes, "word/document.xml") ? "DOCX" : null;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "IMAGE"; // PNG
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "IMAGE"; // JPEG
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "IMAGE"; // WEBP
  return null;
}

/** The image's real type, for sending the photo itself to a model that reads pages. */
export function imageMime(bytes: Uint8Array) {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  return "image/webp";
}

async function rawText(kind: SourceKind, bytes: Uint8Array, ocr: OcrProvider) {
  switch (kind) {
    case "TEXT":
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    case "PDF": {
      const { extractText, getDocumentProxy } = await import("unpdf");
      try {
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        const { text } = await extractText(pdf, { mergePages: true });
        return text;
      } catch {
        throw new ParseInputError(
          "This PDF couldn't be opened. It may be damaged or password protected. Try another copy, or paste the text.",
        );
      }
    }
    case "DOCX": {
      const mammoth = await import("mammoth");
      try {
        const { value } = await mammoth.extractRawText({
          buffer: Buffer.from(bytes),
        });
        return value;
      } catch {
        throw new ParseInputError(
          "This Word file couldn't be opened. Save it again as .docx or PDF, or paste the text.",
        );
      }
    }
    case "IMAGE":
      return ocr.recognize(bytes);
  }
}

/** Extracted, cleaned text, or a ParseInputError saying what to do instead. */
export async function extractText(
  kind: SourceKind,
  bytes: Uint8Array,
  ocr: OcrProvider = unavailableOcr,
) {
  const text = normaliseText(await rawText(kind, bytes, ocr));
  if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
    throw new ParseInputError(
      kind === "PDF"
        ? "This PDF has no readable text. It looks like a scan. Paste the text, or upload a PDF with selectable text."
        : "There isn't enough text here to find subjects and topics. Check the file and try again.",
    );
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new ParseInputError(
      "This file has much more text than a syllabus usually does. Upload only the syllabus pages.",
    );
  }
  return text;
}
