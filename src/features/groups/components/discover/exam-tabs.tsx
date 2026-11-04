import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export type ExamTab = { key: string; name: string; href: string };

/**
 * The exams as tabs, as Discord's Home, Gaming, Music: the open one underlined in the
 * accent. A row that scrolls on its own when the exams outrun the width.
 */
export function ExamTabs({
  tabs,
  current,
  className,
}: {
  tabs: ExamTab[];
  current: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Exam"
      className={cn(
        "flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto",
        className,
      )}
    >
      {tabs.map((t) => {
        const on = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-11 shrink-0 items-center rounded-chip px-3 text-small font-medium whitespace-nowrap transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:h-full",
              "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full",
              on ? "text-ink after:bg-accent" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.name}
          </Link>
        );
      })}
    </nav>
  );
}
