"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

/**
 * An exam pod's sections: its subjects, its plan and, for the user's own upload, its
 * syllabus. Links, so each has its own URL, under one header that stays put.
 */
export function ExamTabs({
  examId,
  editable,
}: {
  examId: string;
  editable: boolean;
}) {
  const pathname = usePathname();
  const base = `/pods/exam/${examId}`;
  const tabs = [
    { href: base, label: "Subjects" },
    { href: `${base}/plan`, label: "Plan" },
    ...(editable ? [{ href: `${base}/syllabus`, label: "Syllabus" }] : []),
  ];
  return (
    <nav
      aria-label="Exam"
      // Scrolls sideways on a narrow phone. The rule is drawn inside the bar (an inset
      // shadow), under the tabs' own underline, so nothing hangs below it and no
      // vertical scrollbar appears.
      className="mb-6 flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)]"
    >
      {tabs.map((t) => {
        const active =
          t.href === base
            ? pathname === base
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3 font-heading text-body font-medium transition-colors duration-[120ms]",
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
