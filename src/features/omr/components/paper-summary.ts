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
  /** The person's own paper: they set its key and marking. */
  owner: boolean;
  /**
   * Someone else's paper: when their score comes out (null: on submitting) and whether
   * the owner keeps the key. Null for the owner's own paper and in a squad exam.
   */
  release?: { resultsAt: string | null; keyHidden: boolean } | null;
};

/** A squad exam's one ranked sitting: its register number and when the exam closes. */
export type ExamSitting = {
  id: string;
  registerNo: number | null;
  closesAt: string | null;
};
