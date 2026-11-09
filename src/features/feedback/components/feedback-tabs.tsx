import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export const FEEDBACK_TABS = ["ideas", "problems", "contributors"] as const;
export type FeedbackTab = (typeof FEEDBACK_TABS)[number];

const LABEL: Record<FeedbackTab, string> = {
  ideas: "Ideas",
  problems: "Report a problem",
  contributors: "Contributors",
};

/** Links, not client tabs: a notification can open the right one straight away. */
export function FeedbackTabs({ tab }: { tab: FeedbackTab }) {
  return (
    <nav
      aria-label="Feedback"
      className="-mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:gap-6 sm:px-0"
    >
      {FEEDBACK_TABS.map((key) => (
        <Link
          key={key}
          href={`/feedback?tab=${key}`}
          scroll={false}
          aria-current={key === tab ? "page" : undefined}
          className={cn(
            "-mb-px flex h-11 shrink-0 items-center border-b-2 font-heading text-body font-medium whitespace-nowrap transition-colors duration-[120ms]",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
            key === tab
              ? "border-accent text-ink"
              : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {LABEL[key]}
        </Link>
      ))}
    </nav>
  );
}
