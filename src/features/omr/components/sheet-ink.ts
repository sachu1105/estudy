// The ink a paper's answer sheet is printed in, as real OMR sheets come in colour: one
// of the icon tints, picked from the paper's id so the card and the sheet always match.
// Literal classes, so Tailwind sees them.

export type SheetInk = {
  /** Bubble outlines. */
  line: string;
  /** A bubble's outline while the pointer is on it. */
  hover: string;
  /** Printed text: letters, numbers, headings. */
  text: string;
  /** The header band of a block. */
  band: string;
  /** The light band behind every other five rows. */
  stripe: string;
  /** Printed rules and placeholder lines on the card's small sheet. */
  bar: string;
};

const INKS: SheetInk[] = [
  {
    line: "border-tint-violet/60",
    hover: "group-hover:border-tint-violet",
    text: "text-tint-violet",
    band: "bg-tint-violet/15",
    stripe: "bg-tint-violet/[0.06]",
    bar: "bg-tint-violet/50",
  },
  {
    line: "border-tint-sky/60",
    hover: "group-hover:border-tint-sky",
    text: "text-tint-sky",
    band: "bg-tint-sky/15",
    stripe: "bg-tint-sky/[0.06]",
    bar: "bg-tint-sky/50",
  },
  {
    line: "border-tint-teal/60",
    hover: "group-hover:border-tint-teal",
    text: "text-tint-teal",
    band: "bg-tint-teal/15",
    stripe: "bg-tint-teal/[0.06]",
    bar: "bg-tint-teal/50",
  },
  {
    line: "border-tint-fuchsia/60",
    hover: "group-hover:border-tint-fuchsia",
    text: "text-tint-fuchsia",
    band: "bg-tint-fuchsia/15",
    stripe: "bg-tint-fuchsia/[0.06]",
    bar: "bg-tint-fuchsia/50",
  },
];

export function sheetInk(id: string): SheetInk {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return INKS[Math.abs(hash) % INKS.length]!;
}
