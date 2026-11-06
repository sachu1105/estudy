import { ChevronRight, FileCheck2, Layers } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export type ListedBundle = {
  id: string;
  title: string;
  papers: { id: string; title: string; questions: number }[];
  owner: boolean;
  by: string;
  /** A Store item the reader's plan includes (not bought). */
  included: boolean;
};

/** Papers shown under each bundle before "All N papers". */
const SHOWN = 3;

/**
 * Bundles the reader has (added, bought or in their plan) and ones they made: each one
 * with its first papers ready to sit, and the rest a tap away. The one just added is
 * outlined.
 */
export function BundleList({
  bundles,
  added,
}: {
  bundles: ListedBundle[];
  added: string | null;
}) {
  return (
    <section aria-labelledby="your-bundles" className="flex flex-col gap-3">
      <h2 id="your-bundles" className="font-heading text-h2 font-semibold">
        Bundles
      </h2>
      <ul className="grid gap-3 lg:grid-cols-2">
        {bundles.map((b) => (
          <li
            key={b.id}
            aria-label={b.title}
            className={cn(
              "overflow-hidden rounded-card border bg-surface",
              b.id === added ? "border-accent" : "border-border",
            )}
          >
            <Link
              href={`/bundles/${b.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
            >
              <Layers className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {b.title}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {b.papers.length} paper{b.papers.length === 1 ? "" : "s"} ·{" "}
                  {b.owner ? "you made it" : `by ${b.by}`}
                </span>
              </span>
              {b.included ? <Badge tone="accent">In your plan</Badge> : null}
              <ChevronRight
                className="size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
            </Link>
            <ul
              aria-label={`Papers in ${b.title}`}
              className="divide-y divide-border border-t border-border"
            >
              {b.papers.slice(0, SHOWN).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/omr/${p.id}`}
                    className="flex min-h-12 items-center gap-3 py-2 pr-4 pl-12 hover:bg-surface-muted"
                  >
                    <FileCheck2
                      className="size-4 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-small">
                      {p.title.replaceAll("_", " ")}
                    </span>
                    <span className="shrink-0 text-small text-ink-muted">
                      {p.questions} q
                    </span>
                  </Link>
                </li>
              ))}
              {b.papers.length > SHOWN ? (
                <li>
                  <Link
                    href={`/bundles/${b.id}`}
                    className="flex min-h-11 items-center py-2 pr-4 pl-12 text-small font-medium text-accent-ink hover:bg-surface-muted"
                  >
                    All {b.papers.length} papers
                  </Link>
                </li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
