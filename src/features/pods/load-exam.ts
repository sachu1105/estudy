import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";
import { selectionOf } from "@/lib/pods/covers";
import { coverService, podService } from "@/server/services/pods";

export type ExamPlanState =
  | { kind: "none" }
  | { kind: "draft" }
  | {
      kind: "active";
      planId: string;
      endDate: string;
      plannedMinutes: number;
    };

/**
 * The exam pod and its plan state, or a 404. Cached so the layout's header and the tab
 * below it share one read.
 */
export const loadExam = cache(async (syllabusId: string) => {
  const user = await requireUser();
  const exam = isId(syllabusId)
    ? await podService.exam(user, syllabusId)
    : null;
  if (!exam) notFound();
  const [active, draft, stored] = await Promise.all([
    planService.activeFor(user, exam.id),
    planService.draftFor(user, exam.id),
    coverService.get(user, { kind: "exam", syllabusId: exam.id }),
  ]);
  const cover = {
    selection: selectionOf(stored),
    view: await coverService.resolve(stored, exam.id),
  };
  const plan: ExamPlanState = active
    ? {
        kind: "active",
        planId: active.id,
        endDate: active.endDate,
        plannedMinutes: active.plannedMinutes,
      }
    : draft
      ? { kind: "draft" }
      : { kind: "none" };
  return { user, exam, plan, cover };
});
