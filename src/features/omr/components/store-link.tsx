import { ChevronRight, Store } from "lucide-react";
import Link from "next/link";

/** The way into the Store from Tests, with how much is in it. */
export function StoreLink({ count }: { count: number }) {
  return (
    <Link
      href="/store"
      className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-transform duration-[120ms] ease-out hover:-translate-y-px hover:shadow-md"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
        <Store className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-medium">Store</span>
        <span className="text-small text-ink-muted">
          {count} previous year{" "}
          {count === 1 ? "paper or bundle" : "papers and bundles"} with answer
          keys
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
    </Link>
  );
}
