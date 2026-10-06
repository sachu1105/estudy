import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

/** The user's plan setup, or a 404. Cached so the layout and the step share one read. */
export const loadDraft = cache(async (draftId: string) => {
  const user = await requireUser();
  const draft = isId(draftId)
    ? await planService.getDraft(user, draftId)
    : null;
  if (!draft) notFound();
  return draft;
});
