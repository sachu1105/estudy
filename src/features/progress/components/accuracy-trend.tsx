import { formatDay } from "@/lib/plans/format";

const KIND = {
  CHECK: "check",
  SECTION: "section mock",
  FULL: "full mock",
  CUSTOM: "test",
  MATERIAL: "test",
} as const;

/** The last tests' accuracy, oldest to newest, with the 60% line that triggers revision. */
export function AccuracyTrend({
  attempts,
}: {
  attempts: {
    id: string;
    type: keyof typeof KIND;
    accuracy: number;
    localDate: string;
  }[];
}) {
  if (attempts.length === 0)
    return (
      <p className="text-body text-ink-muted">
        Take a check test and your accuracy shows here.
      </p>
    );
  const average = Math.round(
    (attempts.reduce((n, a) => n + a.accuracy, 0) / attempts.length) * 100,
  );
  return (
    <figure className="flex flex-col gap-3">
      <div
        className="relative flex h-24 items-end gap-1.5"
        role="img"
        aria-label={`Average ${average}% over the last ${attempts.length} tests.`}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 border-t border-dashed border-border"
          style={{ bottom: "60%" }}
        />
        {attempts.map((a) => (
          <span
            key={a.id}
            title={`${formatDay(a.localDate, false)}, ${KIND[a.type]}: ${Math.round(a.accuracy * 100)}%`}
            className="relative min-w-0 flex-1 rounded-t-[3px] bg-accent"
            style={{ height: `${Math.max(4, a.accuracy * 100)}%` }}
          />
        ))}
      </div>
      <figcaption className="text-small text-ink-muted">
        Average <span className="font-mono tabular-nums">{average}%</span> over
        the last {attempts.length} tests. The dashed line is 60%: below it, a
        topic gets an extra revision.
      </figcaption>
    </figure>
  );
}
