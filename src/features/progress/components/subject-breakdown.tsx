import { formatMinutes } from "@/lib/plans/format";

type Subject = {
  id: string;
  name: string;
  topics: number;
  done: number;
  minutes: number;
  accuracy: { avg: number; count: number } | null;
};

/** Each subject of the active plans: topics done, time studied, test accuracy. */
export function SubjectBreakdown({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0)
    return (
      <p className="text-body text-ink-muted">
        Make a plan from an exam pod to see each subject here.
      </p>
    );
  return (
    <ul className="flex flex-col gap-4">
      {subjects.map((s) => {
        const percent = s.topics ? Math.round((s.done / s.topics) * 100) : 0;
        return (
          <li key={s.id} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body font-medium">{s.name}</span>
              <span className="text-small text-ink-muted">
                {s.done} of {s.topics} topics · {formatMinutes(s.minutes)}
                {s.accuracy
                  ? ` · ${Math.round(s.accuracy.avg * 100)}% in ${s.accuracy.count} test${s.accuracy.count === 1 ? "" : "s"}`
                  : ""}
              </span>
            </div>
            <span
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-label={`${s.name} topics done`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
