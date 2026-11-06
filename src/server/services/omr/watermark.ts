import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

// A personal copy of a question paper for someone who didn't upload it (a bundle, the
// Store, a squad exam): who it's for, from where and when, stamped faintly across
// every page and printed in a footer, so a copy that leaves the app says whose it was.

export type Stamp = {
  name: string;
  email: string;
  ip: string;
  /** Already formatted in the person's time zone. */
  at: string;
};

const INK = rgb(0.37, 0.37, 0.42);

/** The standard fonts draw WinAnsi only: anything else becomes "?". */
const plain = (text: string) =>
  text.normalize("NFKD").replace(/[^\x20-\x7e]/g, "?");

export async function watermark(bytes: Uint8Array, stamp: Stamp) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const who = plain(`${stamp.name} - ${stamp.email}`);
  const where = plain(`IP ${stamp.ip} - ${stamp.at}`);
  const footer = plain(
    `Personal copy for ${stamp.name} (${stamp.email}), IP ${stamp.ip}, ${stamp.at}. Not for sharing - studypods`,
  );

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    // A diagonal stamp in a loose grid, faint enough to read the questions through.
    const size = Math.max(10, Math.min(width, height) / 40);
    for (let y = -height * 0.2; y < height * 1.1; y += size * 14)
      for (let x = -width * 0.2; x < width; x += size * 22) {
        page.drawText(who, {
          x,
          y,
          size,
          font,
          color: INK,
          opacity: 0.1,
          rotate: degrees(30),
        });
        page.drawText(where, {
          x: x + size * 0.6,
          y: y - size * 1.4,
          size: size * 0.8,
          font,
          color: INK,
          opacity: 0.1,
          rotate: degrees(30),
        });
      }
    // The footer, small and plain, at the foot of every page.
    let footSize = 7;
    while (
      footSize > 4 &&
      font.widthOfTextAtSize(footer, footSize) > width - 24
    )
      footSize -= 0.5;
    page.drawText(footer, {
      x: 12,
      y: 8,
      size: footSize,
      font,
      color: INK,
      opacity: 0.8,
    });
  }
  doc.setProducer("studypods");
  doc.setSubject(plain(`Personal copy for ${stamp.name} (${stamp.email})`));
  return doc.save();
}
