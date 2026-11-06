import { ChevronRight, Layers } from "lucide-react";
import Link from "next/link";

export type ListedBundle = {
  id: string;
  title: string;
  papers: number;
  owner: boolean;
  by: string;
};

/** Bundles the reader has (added or bought) and ones they made, one dense row each. */
export function BundleList({ bundles }: { bundles: ListedBundle[] }) {
  return (
    <section aria-labelledby="your-bundles" className="flex flex-col gap-3">
      <h2 id="your-bundles" className="font-heading text-h2 font-semibold">
        Bundles
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {bundles.map((b) => (
          <li key={b.id}>
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
                  {b.papers} paper{b.papers === 1 ? "" : "s"} ·{" "}
                  {b.owner ? "you made it" : `by ${b.by}`}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
