import { Star } from "lucide-react";

import { STAR_WORDS } from "@/lib/feedback/schemas";

type Props = {
  counts: number[];
  total: number;
  average: number | null;
  recent: { stars: number; note: string | null; by: string; when: string }[];
};

/** The average, how the stars spread, and the latest notes people left with a rating. */
export function RatingSummary({ counts, total, average, recent }: Props) {
  const most = Math.max(1, ...counts);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-5">
        <div className="flex flex-col">
          <span className="text-micro text-ink-muted uppercase">Average</span>
          <span className="font-heading text-display font-semibold tabular-nums">
            {average === null ? "-" : average.toFixed(1)}
          </span>
          <span className="text-small text-ink-muted">
            from {total} {total === 1 ? "rating" : "ratings"}
          </span>
        </div>
        <ul aria-label="Ratings by stars" className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = counts[stars - 1] ?? 0;
            return (
              <li key={stars} className="flex items-center gap-3 text-small">
                <span className="flex w-10 shrink-0 items-center gap-1 text-ink-muted">
                  {stars} <Star className="size-3.5" aria-hidden />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${(n / most) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums">
                  {n}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <section aria-labelledby="notes" className="flex flex-col gap-3">
        <h2 id="notes" className="text-h3">
          What people said
        </h2>
        {recent.length === 0 ? (
          <p className="text-body text-ink-muted">No notes with ratings yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {recent.map((r, i) => (
              <li key={i} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-small text-ink-muted">
                  <span className="font-medium text-ink">
                    {r.stars} · {STAR_WORDS[r.stars - 1]}
                  </span>{" "}
                  · {r.by}, {r.when}
                </span>
                <p className="text-body wrap-break-word whitespace-pre-wrap">
                  {r.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
