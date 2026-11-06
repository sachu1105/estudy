import Link from "next/link";

import { formatScore, type Fraction } from "@/lib/omr/fraction";
import { cn } from "@/lib/utils/cn";

/** Every time the paper was handed in, newest first, scored against today's key. */
export function SittingsList({
  paperId,
  current,
  sittings,
  scored,
  timeZone,
}: {
  paperId: string;
  current: string;
  sittings: { id: string; number: number; createdAt: Date; score: Fraction }[];
  /** Some of the key is in: scores mean something. */
  scored: boolean;
  timeZone: string;
}) {
  const when = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return (
    <section aria-labelledby="sittings" className="flex flex-col gap-3">
      <h2 id="sittings" className="font-heading text-h2 font-semibold">
        Your sittings
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {sittings.map((s) => (
          <li key={s.id}>
            <Link
              href={`/omr/${paperId}/result/${s.id}`}
              aria-current={s.id === current ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 px-4 py-2 text-small hover:bg-surface-muted",
                s.id === current &&
                  "bg-accent-soft text-accent-ink hover:bg-accent-soft",
              )}
            >
              <span className="font-medium">Sitting {s.number}</span>
              <span className="flex-1 truncate text-ink-muted">
                {when.format(s.createdAt)}
              </span>
              <span className="font-mono tabular-nums">
                {scored ? formatScore(s.score) : "–"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
