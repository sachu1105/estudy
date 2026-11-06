import { ChevronRight, Library } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { rupees } from "@/lib/pricing/pricing";

export type ShelfItem = {
  id: string;
  title: string;
  papers: number;
  pricePaise: number | null;
  have: boolean;
  included: boolean;
  /** Plans that include it, for those who don't have it yet. */
  includedIn: string[];
};

const planName = (p: string) =>
  p === "PRO" ? "Pro" : p === "ELITE" ? "Elite" : p;

/** Where an entry stands for the reader: theirs, in their plan, free, or its price. */
function standing(item: ShelfItem) {
  if (item.included) return <Badge tone="accent">In your plan</Badge>;
  if (item.have) return <Badge tone="neutral">Yours</Badge>;
  return (
    <span className="font-mono text-small font-medium tabular-nums">
      {item.pricePaise === null ? "Free" : rupees(item.pricePaise)}
    </span>
  );
}

/**
 * The studypods library: past papers and bundles anyone can add, buy, or get with their
 * plan. One dense row each, to its page.
 */
export function LibraryShelf({ items }: { items: ShelfItem[] }) {
  return (
    <section aria-labelledby="library" className="flex flex-col gap-3">
      <h2 id="library" className="font-heading text-h2 font-semibold">
        Library
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/bundles/${item.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
            >
              <Library className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {item.title}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {item.papers} paper{item.papers === 1 ? "" : "s"}
                  {!item.have && item.includedIn.length
                    ? ` · free with ${item.includedIn.map(planName).join(" or ")}`
                    : ""}
                </span>
              </span>
              {standing(item)}
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
