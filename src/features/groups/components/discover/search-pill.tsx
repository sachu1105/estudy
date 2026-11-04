import { Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/** Search squads by name, keeping the exam picked. Enter searches. */
export function SearchPill({
  examId,
  q,
  className,
}: {
  examId: string | null;
  q: string;
  className?: string;
}) {
  return (
    <form
      role="search"
      action="/groups/discover"
      className={cn("relative", className)}
    >
      {examId ? <input type="hidden" name="exam" value={examId} /> : null}
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search squads"
        aria-label="Search squads"
        className="h-11 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-base text-ink placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:h-9 md:bg-surface-muted md:text-small"
      />
    </form>
  );
}
