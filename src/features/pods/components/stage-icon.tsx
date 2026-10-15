import type { PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

const tone: Record<PodStage, string> = {
  TO_STUDY: "text-ink-subtle",
  STUDYING: "text-accent",
  REVISING: "text-ink-muted",
  DONE: "text-success",
};

/**
 * A board column's glyph: a circle that fills as a subject moves along, from dashed
 * (to study) through half and three quarters to a check (done). Decorative.
 */
export function StageIcon({
  stage,
  className,
}: {
  stage: PodStage;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("size-4 shrink-0", tone[stage], className)}
    >
      {stage === "DONE" ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.2l2 2 4-4.2"
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-surface"
          />
        </>
      ) : (
        <>
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray={stage === "TO_STUDY" ? "2.6 2.3" : undefined}
          />
          {stage === "STUDYING" ? (
            <path d="M8 4.5A3.5 3.5 0 0 1 8 11.5Z" fill="currentColor" />
          ) : null}
          {stage === "REVISING" ? (
            <path
              d="M8 8V4.5A3.5 3.5 0 1 1 4.5 8Z"
              fill="currentColor"
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
