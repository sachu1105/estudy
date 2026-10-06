import { normaliseText } from "@/server/ai/chunk";

/** A PDF's text layer and page count. A scan (no real text) gives null text. */
export async function readPdf(bytes: Uint8Array) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const clean = normaliseText(text);
  return {
    text: clean.replace(/\s/g, "").length >= 40 ? clean : null,
    pages: pdf.numPages,
  };
}
