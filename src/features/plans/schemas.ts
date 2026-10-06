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
});

export type ActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };
