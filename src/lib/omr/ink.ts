// What an answer sheet is printed and marked in, shared by the sheet on screen and its
// PDF: one of four inks picked from the paper's id (so a paper's card, sheet and PDF all
// match), and the pen the person marks with.

export const OMR_INKS = ["violet", "sky", "teal", "fuchsia"] as const;
export type OmrInk = (typeof OMR_INKS)[number];

export const OMR_PENS = ["black", "blue"] as const;
export type Pen = (typeof OMR_PENS)[number];

export function inkOf(id: string): OmrInk {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return OMR_INKS[Math.abs(hash) % OMR_INKS.length]!;
}
