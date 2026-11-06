import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";

import { BLANK, blankMarks } from "@/lib/omr/marks";

import { answerSheetPdf } from "./answer-pdf";

async function textOf(bytes: Uint8Array) {
  const { text } = await extractText(
    await getDocumentProxy(new Uint8Array(bytes)),
    {
      mergePages: true,
    },
  );
  return text;
}

describe("answer sheet pdf", () => {
  const marks = blankMarks().map((_, i) =>
    i === 0 ? 1 : i === 99 ? 3 : BLANK,
  );

  it("prints the paper, the count and every question on one page", async () => {
    const bytes = await answerSheetPdf({
      title: "LDC_2024_paper",
      marks,
      options: 4,
      ink: "teal",
      pen: "blue",
      printedAt: "5 Nov 2026, 3:42 pm",
    });
    expect((await getDocumentProxy(new Uint8Array(bytes))).numPages).toBe(1);
    const text = await textOf(bytes);
    expect(text).toContain("LDC 2024 paper");
    expect(text).toContain("Marked 2 of 100");
    expect(text).toContain("100");
    expect(text).toContain("5 Nov 2026, 3:42 pm");
  });

  it("drops what the PDF font can't print, and falls back when nothing is left", async () => {
    const mixed = await answerSheetPdf({
      title: "LDC paper — മലയാളം",
      marks,
      options: 4,
      ink: "violet",
      pen: "black",
      printedAt: "today",
    });
    expect(await textOf(mixed)).toContain("LDC paper");
    expect(await textOf(mixed)).not.toContain("—");
    const none = await answerSheetPdf({
      title: "മലയാളം",
      marks,
      options: 4,
      ink: "violet",
      pen: "black",
      printedAt: "today",
    });
    expect(await textOf(none)).toContain("Question paper");
  });

  it("runs a long paper onto more pages, with A to E", async () => {
    const bytes = await answerSheetPdf({
      title: "Degree level",
      marks: blankMarks(150).map((_, i) => (i === 149 ? 4 : BLANK)),
      options: 5,
      ink: "sky",
      pen: "black",
      printedAt: "today",
    });
    expect((await getDocumentProxy(new Uint8Array(bytes))).numPages).toBe(2);
    const text = await textOf(bytes);
    expect(text).toContain("Marked 1 of 150");
    expect(text).toContain("150");
    expect(text).toContain("Page 2 of 2");
  });
});
