import { describe, expect, it } from "vitest";

import { makePdf, sampleSyllabus } from "../../../../tests/support/pdf";

import { extractText, ParseInputError, sniffKind } from "./extract";

const bytes = (...values: number[]) =>
  new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("sniffKind", () => {
  it("recognises files by their bytes, not their names", () => {
    expect(sniffKind(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("PDF");
    expect(sniffKind(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("IMAGE");
    expect(sniffKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("IMAGE");
    const docx = new TextEncoder().encode(
      "PK\u0003\u0004....word/document.xml....",
    );
    expect(sniffKind(docx)).toBe("DOCX");
  });

  it("rejects HTML, SVG and zips that aren't Word files", () => {
    expect(
      sniffKind(new TextEncoder().encode("<!doctype html><script>")),
    ).toBeNull();
    expect(
      sniffKind(new TextEncoder().encode("<svg onload=alert(1)>")),
    ).toBeNull();
    expect(
      sniffKind(new TextEncoder().encode("PK\u0003\u0004....xl/workbook.xml")),
    ).toBeNull();
  });
});

describe("extractText", () => {
  it("reads the text layer of a PDF", async () => {
    const text = await extractText("PDF", makePdf(sampleSyllabus));
    expect(text).toContain("Part I: General Knowledge (50 marks)");
    expect(text).toContain("Parts of speech, tenses");
  });

  it("explains a scanned PDF with no text layer", async () => {
    await expect(extractText("PDF", makePdf([]))).rejects.toThrow(
      /looks like a scan/,
    );
  });

  it("explains a damaged PDF", async () => {
    await expect(
      extractText("PDF", new TextEncoder().encode("%PDF-1.4 broken")),
    ).rejects.toBeInstanceOf(ParseInputError);
  });

  it("says photos aren't read yet instead of failing silently", async () => {
    await expect(extractText("IMAGE", bytes(0x89, 0x50))).rejects.toThrow(
      /photos isn't available yet/,
    );
  });

  it("cleans pasted text", async () => {
    const text = await extractText(
      "TEXT",
      new TextEncoder().encode(`  ${sampleSyllabus.join("\r\n\r\n\r\n")}  `),
    );
    expect(text.startsWith("Kerala PSC")).toBe(true);
    expect(text).not.toMatch(/\n{3}/);
  });
});
