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
  | { kind: "paused" }
  | {
      kind: "active";
      planId: string;
      endDate: string;
      plannedMinutes: number;
    };

/** What this exam is to the user: how much of the day it gets, and whether it leads. */
export type ExamRank = {
  role: "FOCUS" | "ALONGSIDE" | "PAUSED";
  sharePercent: number;
  /** Another exam is running too, so the share is worth showing at all. */
  shared: boolean;
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
  const [active, draft, stored, roles] = await Promise.all([
    planService.activeFor(user, exam.id),
    planService.draftFor(user, exam.id),
    coverService.get(user, { kind: "exam", syllabusId: exam.id }),
    planService.roles(user),
  ]);
  const ranked = roles.find((r) => r.examId === exam.id) ?? null;
  const rank: ExamRank | null = ranked
    ? {
        role: ranked.role,
        sharePercent: ranked.sharePercent,
        shared: ranked.shared,
      }
    : null;
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
    : // A paused exam has a plan, just not a running one: it must never be offered the
      // "create a study plan" button as though it had none.
      rank?.role === "PAUSED"
      ? { kind: "paused" }
      : draft
        ? { kind: "draft" }
        : { kind: "none" };
  return { user, exam, plan, cover, rank };
});
