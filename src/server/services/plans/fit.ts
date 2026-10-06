import { generatePlan, type PlanInput } from "@/lib/plan-engine";

export type LeftOutTopic = {
  topicId: string;
  topicName: string;
  subjectName: string;
};

type Subjects = PlanInput["subjects"];

/**
 * "Accept partial coverage": the fewest topics to leave out so the plan fits, least
 * important first. Order: lowest weight, then subjects lower on the board, then later
 * in the syllabus. Topics already ticked, and Revising or Done subjects (no study left),
 * are never chosen. Returns null if nothing fits even with every candidate left out.
 *
 * Deterministic: a binary search over how many of that fixed order to drop.
 */
export function leaveOutToFit(input: PlanInput) {
  const done = new Set(
    (input.overrides ?? []).flatMap((o) =>
      o.kind === "TOPIC_DONE" ? [o.topicId] : [],
    ),
  );
  const candidates = input.subjects
    .flatMap((subject, subjectIndex) =>
      subject.stage === "REVISING" || subject.stage === "DONE"
        ? []
        : subject.topics
            .filter((t) => !done.has(t.id))
            .map((topic) => ({ subject, subjectIndex, topic })),
    )
    .sort(
      (a, b) =>
        a.topic.weight - b.topic.weight ||
        b.subjectIndex - a.subjectIndex ||
        b.topic.order - a.topic.order,
    );

  const without = (count: number): Subjects => {
    const drop = new Set(candidates.slice(0, count).map((c) => c.topic.id));
    return input.subjects
      .map((s) => ({ ...s, topics: s.topics.filter((t) => !drop.has(t.id)) }))
      .filter((s) => s.topics.length > 0);
  };
  const fits = (count: number) => {
    const subjects = without(count);
    return (
      subjects.length > 0 &&
      generatePlan({ ...input, subjects }).kind === "PLAN"
    );
  };

  // Leave at least one topic to plan, unless other subjects still have work.
  let high =
    without(candidates.length).length > 0
      ? candidates.length
      : candidates.length - 1;
  if (high < 1 || !fits(high)) return null;
  let low = 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (fits(mid)) high = mid;
    else low = mid + 1;
  }
  return {
    input: { ...input, subjects: without(low) },
    leftOut: candidates.slice(0, low).map((c): LeftOutTopic => ({
      topicId: c.topic.id,
      topicName: c.topic.name,
      subjectName: c.subject.name,
    })),
  };
}
