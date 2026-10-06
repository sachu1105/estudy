import { Badge } from "@/components/ui/badge";
import {
  studyMinutes,
  type PlanInput,
  type TopicAdjustment,
} from "@/lib/plan-engine";
import { stageHints, stageLabels } from "@/lib/pods/stages";
import { formatMinutes } from "@/lib/plans/format";

const CONFIDENCE = ["new to me", "a little", "some", "good", "strong"];

/** Each subject as the plan saw it: board stage, the two dials, and the time it adds up to. */
export function HowSubjects({
  input,
  adjustments,
}: {
  input: PlanInput;
  adjustments: TopicAdjustment[];
}) {
  const done = new Set(
    (input.overrides ?? []).flatMap((o) =>
      o.kind === "TOPIC_DONE" ? [o.topicId] : [],
    ),
  );
  const changed = new Map(adjustments.map((a) => [a.topicId, a]));
  return (
    <section aria-labelledby="how-subjects" className="flex flex-col gap-3">
      <h2 id="how-subjects" className="text-h2">
        Subjects, in board order
      </h2>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {input.subjects.map((s) => {
          const stage = s.stage ?? "TO_STUDY";
          const open = s.topics.filter((t) => !done.has(t.id));
          const minutes = open.reduce(
            (n, t) =>
              n +
              studyMinutes(
                t.weight,
                t.difficulty,
                s.intensity,
                (changed.get(t.id)?.confidence ?? s.confidence) as
                  1 | 2 | 3 | 4 | 5,
              ),
            0,
          );
          const moved = s.topics.filter(
            (t) =>
              changed.get(t.id) &&
              changed.get(t.id)!.confidence !== s.confidence,
          ).length;
          return (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-h3 break-words">{s.name}</h3>
                <Badge>{stageLabels[stage]}</Badge>
              </div>
              <p className="text-small text-ink-muted">{stageHints[stage]}.</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                <dt className="text-ink-muted">Confidence</dt>
                <dd>
                  {s.confidence}, {CONFIDENCE[s.confidence - 1]}
                </dd>
                <dt className="text-ink-muted">Intensity</dt>
                <dd>{s.intensity.toLowerCase()}</dd>
                <dt className="text-ink-muted">Topics</dt>
                <dd>
                  {open.length} to plan
                  {s.topics.length > open.length
                    ? `, ${s.topics.length - open.length} ticked done`
                    : ""}
                </dd>
                <dt className="text-ink-muted">Study time</dt>
                <dd className="font-mono tabular-nums">
                  {formatMinutes(minutes)}
                </dd>
              </dl>
              {moved > 0 ? (
                <p className="text-small text-ink-muted">
                  Confidence moved for {moved} topic{moved === 1 ? "" : "s"}{" "}
                  after check tests and revisions.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
