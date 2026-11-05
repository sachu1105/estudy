import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import type { OmrInk, Pen } from "@/lib/omr/ink";
import { BLANK, OMR_OPTIONS, type Marks } from "@/lib/omr/marks";

// The marked answer sheet as an A4 PDF, drawn like the sheet on screen: printed in the
// paper's ink, four ruled columns of 25 with every five rows shaded in a checkerboard,
// timing marks down the right edge, a barcode at the foot, and each answer filled in
// the person's pen. Colours are the light theme's tokens (paper is white in any theme).

const hex = (value: string): RGB =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

const INK: Record<OmrInk, RGB> = {
  violet: hex("#6d3fd9"),
  sky: hex("#0b78b5"),
  teal: hex("#0d7d72"),
  fuchsia: hex("#a62bb8"),
};
const PEN: Record<Pen, RGB> = { black: hex("#16161a"), blue: hex("#1f3fbf") };
const MUTED = hex("#5f5f6b");
const WHITE = rgb(1, 1, 1);

const [W, H] = [595.28, 841.89];
const MARGIN = 36;
const COLUMN = 25;
const NUMBER_W = 26;
const BUBBLE = { w: 17, h: 11.5, r: 4.5 };
const BARCODE = [1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1];

/** A rounded rectangle as an SVG path, drawn down and right from its top-left corner. */
const rounded = (w: number, h: number, r: number) =>
  `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;

/** Only what the standard PDF font can print; a title in another script falls back. */
function printable(font: PDFFont, text: string, fallback: string) {
  const kept = [...text.replaceAll("_", " ")]
    .filter((ch) => {
      try {
        font.encodeText(ch);
        return true;
      } catch {
        return false;
      }
    })
    .join("")
    .replace(/\s+/g, " ")
    // Punctuation left dangling where the other script was.
    .replace(/^[\s\-–—:·|,(]+|[\s\-–—:·|,(]+$/g, "");
  return /[\p{L}\p{N}]/u.test(kept) ? kept : fallback;
}

/** Cut to fit a width, with an ellipsis. */
function fit(font: PDFFont, text: string, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let cut = text;
  while (cut && font.widthOfTextAtSize(`${cut}...`, size) > width)
    cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

export async function answerSheetPdf(sheet: {
  title: string;
  marks: Marks;
  ink: OmrInk;
  pen: Pen;
  /** When it was printed, already written out in the person's time zone. */
  printedAt: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = INK[sheet.ink];
  const pen = PEN[sheet.pen];
  const title = printable(bold, sheet.title, "Question paper");
  const marked = sheet.marks.filter((m) => m !== BLANK).length;
  doc.setTitle(`${title} - answer sheet`);
  doc.setCreator("studypods");
  doc.setProducer("studypods");

  // Header band: what the sheet is, which paper, and how much is marked.
  const bandTop = H - MARGIN;
  page.drawRectangle({
    x: MARGIN,
    y: bandTop - 64,
    width: W - 2 * MARGIN,
    height: 64,
    color: ink,
    opacity: 0.12,
  });
  page.drawText("ANSWER SHEET", {
    x: MARGIN + 14,
    y: bandTop - 20,
    size: 8,
    font: bold,
    color: ink,
  });
  page.drawText(fit(bold, title, 15, W - 2 * MARGIN - 150), {
    x: MARGIN + 14,
    y: bandTop - 40,
    size: 15,
    font: bold,
    color: ink,
  });
  page.drawText("Darken the bubble completely.", {
    x: MARGIN + 14,
    y: bandTop - 55,
    size: 8,
    font,
    color: ink,
  });
  const count = `Marked ${marked} of ${sheet.marks.length}`;
  page.drawText(count, {
    x: W - MARGIN - 14 - bold.widthOfTextAtSize(count, 11),
    y: bandTop - 38,
    size: 11,
    font: bold,
    color: ink,
  });

  // The grid of four columns, with a timing mark beside every row.
  const gridTop = bandTop - 84;
  const gridBottom = MARGIN + 40;
  const rowH = (gridTop - gridBottom) / COLUMN;
  const gridW = W - 2 * MARGIN - 18;
  const gap = 10;
  const colW = (gridW - gap * 3) / 4;
  for (let c = 0; c * COLUMN < sheet.marks.length; c++) {
    const x = MARGIN + c * (colW + gap);
    page.drawRectangle({
      x,
      y: gridBottom,
      width: colW,
      height: gridTop - gridBottom,
      borderColor: ink,
      borderWidth: 0.75,
      borderOpacity: 0.6,
    });
    for (let i = 0; i < COLUMN && c * COLUMN + i < sheet.marks.length; i++) {
      const y = gridTop - (i + 1) * rowH;
      drawRow(
        page,
        { x, y, colW, rowH, ink, pen, font, bold },
        c * COLUMN + i,
        sheet.marks[c * COLUMN + i]!,
        (Math.floor(i / 5) + c) % 2 === 1,
      );
    }
  }
  for (let i = 0; i < COLUMN; i++)
    page.drawRectangle({
      x: W - MARGIN - 10,
      y: gridTop - (i + 0.5) * rowH - 2.5,
      width: 10,
      height: 5,
      color: PEN.black,
    });

  // Foot: a barcode, and when it was printed.
  let bar = MARGIN;
  BARCODE.forEach((width, i) => {
    if (i % 2 === 0)
      page.drawRectangle({
        x: bar,
        y: MARGIN,
        width: width * 1.2,
        height: 18,
        color: PEN.black,
      });
    bar += width * 1.2 + 1.2;
  });
  const foot = `Printed from studypods on ${sheet.printedAt}`;
  page.drawText(foot, {
    x: W - MARGIN - font.widthOfTextAtSize(foot, 8),
    y: MARGIN + 5,
    size: 8,
    font,
    color: MUTED,
  });

  return doc.save();
}

function drawRow(
  page: PDFPage,
  at: {
    x: number;
    y: number;
    colW: number;
    rowH: number;
    ink: RGB;
    pen: RGB;
    font: PDFFont;
    bold: PDFFont;
  },
  question: number,
  mark: number,
  shaded: boolean,
) {
  const { x, y, colW, rowH, ink, pen, font, bold } = at;
  if (shaded)
    page.drawRectangle({
      x,
      y,
      width: colW,
      height: rowH,
      color: ink,
      opacity: 0.12,
    });
  page.drawLine({
    start: { x: x + NUMBER_W, y },
    end: { x: x + NUMBER_W, y: y + rowH },
    thickness: 0.75,
    color: ink,
    opacity: 0.6,
  });
  const number = String(question + 1);
  page.drawText(number, {
    x: x + NUMBER_W - 5 - bold.widthOfTextAtSize(number, 8.5),
    y: y + rowH / 2 - 3,
    size: 8.5,
    font: bold,
    color: ink,
  });

  const room = colW - NUMBER_W;
  const space =
    (room - OMR_OPTIONS.length * BUBBLE.w) / (OMR_OPTIONS.length + 1);
  OMR_OPTIONS.forEach((letter, o) => {
    const bx = x + NUMBER_W + space + o * (BUBBLE.w + space);
    const by = y + (rowH + BUBBLE.h) / 2;
    const filled = mark === o;
    page.drawSvgPath(rounded(BUBBLE.w, BUBBLE.h, BUBBLE.r), {
      x: bx,
      y: by,
      color: filled ? pen : undefined,
      borderColor: filled ? pen : ink,
      borderWidth: 0.75,
      borderOpacity: filled ? 1 : 0.7,
    });
    page.drawText(letter, {
      x: bx + (BUBBLE.w - font.widthOfTextAtSize(letter, 7)) / 2,
      y: by - BUBBLE.h / 2 - 2.5,
      size: 7,
      font,
      color: filled ? WHITE : ink,
    });
  });
}
