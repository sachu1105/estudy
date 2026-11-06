import type { Marking } from "@/lib/omr/marking";
import type { Shape } from "@/lib/omr/marks";

/** What the sheet's pages know about a paper (PaperView from the service, minus dates). */
export type PaperSummary = {
  id: string;
  title: string;
  shape: Shape;
  marking: Marking;
  limitMin: number | null;
  keyed: number;
};
