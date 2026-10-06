import type { TaskReason } from "@/lib/plan-engine";
import { formatDay } from "@/lib/plans/format";

export type TaskLike = {
  type:
    | "STUDY"
    | "REVISION"
    | "CHECK_TEST"
    | "SECTION_MOCK"
    | "FULL_MOCK"
    | "CUSTOM";
  title: string | null;
  partIndex: number | null;
  partTotal: number | null;
  touch: number | null;
  finalReview: boolean;
};

/** What the task is, in a few words. */
export function taskTitle(task: TaskLike, topic: string, subject: string) {
  switch (task.type) {
    case "STUDY":
      return task.partTotal && task.partTotal > 1
        ? `Study ${topic} (part ${task.partIndex} of ${task.partTotal})`
        : `Study ${topic}`;
    case "CHECK_TEST":
      return `Check test: ${topic}`;
    case "REVISION":
      return task.finalReview ? `Final review: ${topic}` : `Revise ${topic}`;
    case "SECTION_MOCK":
      return `Section mock: ${subject}`;
    case "FULL_MOCK":
      return "Full mock test";
    case "CUSTOM":
      return task.title ?? "Your task";
  }
}

/** "Why this?" (rule 14): the engine's reason, as sentences. */
export function whyThis(reason: TaskReason, subject: string): string[] {
  const lines: string[] = [];
  const b = reason.breakdown;
  if (reason.override)
    lines.push("You placed this task yourself, so re-plans keep it as it is.");
  switch (reason.rule) {
    case "STUDY_BLOCK":
      if (reason.study?.foundationalFirst)
        lines.push("New to PSC: basics come first.");
      if (reason.study?.beginnerBlock)
        lines.push(
          `Your first week uses ${reason.study.blockCap}-minute blocks.`,
        );
      break;
    case "CHECK_AFTER_STUDY":
      lines.push(
        "Every study block ends with a 5-question check on the topic.",
      );
      break;
    case "SPACED_REVISION": {
      const r = reason.revision;
      if (r?.fromBoard)
        lines.push(
          `${subject} is in ${r.fromBoard === "DONE" ? "Done" : "Revising"} on your board, so it gets revision, not study.`,
        );
      else if (r)
        lines.push(
          `Revision ${r.touch}, ${r.gapDays} day${r.gapDays === 1 ? "" : "s"} after you studied it (${formatDay(r.studiedOn, false)}).`,
        );
      if (r?.extra === "LOW_CONFIDENCE")
        lines.push("An extra early revision because your confidence is low.");
      if (r?.extra === "WEAK_CHECK_TEST")
        lines.push("An extra revision because a check test came in under 60%.");
      if (r?.clampedToEnd)
        lines.push("Moved earlier so it lands before your exam.");
      break;
    }
    case "FINAL_REVIEW":
      lines.push("The last 15% of your time is for review and full mocks.");
      break;
    case "SECTION_COMPLETE":
      lines.push(
        `Every ${subject} topic is studied and revised twice: time for a section mock.`,
      );
      break;
    case "FULL_MOCK":
      lines.push("Full mocks are spread over your review days.");
      break;
    case "USER_TASK":
      break;
  }
  if (b)
    lines.push(
      `${b.topicMinutes} min in all: ${b.baseMinutes} min for its size (weight ${b.weight}, difficulty ${b.difficulty}) × ${b.intensityPct}% for ${b.intensity.toLowerCase()} × ${b.confidencePct}% for confidence ${b.confidence}.`,
    );
  return lines;
}
