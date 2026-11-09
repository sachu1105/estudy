import type { ProgrammePage } from "@/lib/exam-calendar/psc-programme";

/** A programme is a few dozen pages; anything far longer isn't one. */
const MAX_PAGES = 120;

/**
 * Each page's words with where they sit (PDF points, origin bottom-left) and its web
 * links, which is what the programme reader works from.
 */
export async function pdfPages(bytes: Uint8Array): Promise<ProgrammePage[]> {
  const { getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  try {
    const pages: ProgrammePage[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [
              {
                str: item.str,
                x: Math.round(item.transform[4] as number),
                y: Math.round(item.transform[5] as number),
                w: Math.round(item.width),
              },
            ]
          : [],
      );
      const annotations = (await page.getAnnotations()) as {
        subtype?: string;
        url?: string;
        rect?: number[];
      }[];
      const links = annotations.flatMap((a) =>
        a.subtype === "Link" && a.url && a.rect
          ? [
              {
                url: a.url,
                x: Math.round((a.rect[0]! + a.rect[2]!) / 2),
                y: Math.round((a.rect[1]! + a.rect[3]!) / 2),
              },
            ]
          : [],
      );
      pages.push({ items, links });
    }
    return pages;
  } finally {
    await doc.loadingTask.destroy();
  }
}
