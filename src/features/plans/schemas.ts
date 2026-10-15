import { z } from "zod";

import { planDraftSchema } from "@/lib/plans/draft";

export const startPlanSchema = z.object({ syllabusId: z.uuid() });
export const saveDraftSchema = z.object({
  draftId: z.uuid(),
  data: planDraftSchema,
});
export const generateSchema = z.object({
  draftId: z.uuid(),
  fit: z.enum(["ALL", "PARTIAL"]),
  /** The user took the offer to make this exam their focus at the review step. */
  focus: z.boolean().default(false),
});

export type ActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };
