import type { Marks } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";

import { saveMarksAction, submitSheetAction, timerAction } from "../actions";
import {
  saveExamMarksAction,
  startExamAction,
  submitExamAction,
} from "../exam-actions";

type Failed = { ok: false; error: string };
export type TimerOp =
  { op: "start"; limitMin: number | null } | { op: "reset" };

/**
 * Where the sheet's marks, clock and hand-in go: the person's own sheet for a paper, or
 * their one sitting in a squad exam, whose clock can't be reset.
 */
export type SheetApi = {
  examId: string | null;
  saveMarks: (marks: Marks) => Promise<{ ok: true } | Failed>;
  timer: (op: TimerOp) => Promise<{ ok: true; timer: TimerView } | Failed>;
  /** Hands the sheet in; resolves to where the person goes next. */
  submit: () => Promise<{ ok: true; href: string } | Failed>;
};

export function sheetApi(paperId: string, examId: string | null): SheetApi {
  if (examId === null)
    return {
      examId,
      saveMarks: (marks) => saveMarksAction({ id: paperId, marks }),
      timer: (timer) => timerAction({ id: paperId, timer }),
      submit: async () => {
        const result = await submitSheetAction({ id: paperId });
        return result.ok
          ? { ok: true, href: `/omr/${paperId}/result/${result.submissionId}` }
          : result;
      },
    };
  return {
    examId,
    saveMarks: (marks) => saveExamMarksAction({ id: examId, marks }),
    timer: async (op) =>
      op.op === "start"
        ? startExamAction({ id: examId })
        : { ok: false, error: "An exam's clock can't be reset." },
    submit: async () => {
      const result = await submitExamAction({ id: examId });
      return result.ok ? { ok: true, href: `/exams/${examId}` } : result;
    },
  };
}
