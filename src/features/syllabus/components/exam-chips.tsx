"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Which exam a syllabus is for, as tappable chips (there are only a handful), with
 * "Other" for anything else. Arrow keys move between them like any radio group.
 */
export function ExamChips({
  exams,
  value,
  onChange,
  disabled,
}: {
  exams: { id: string; name: string }[];
  /** "" means other / not listed. */
  value: string;
  onChange: (examId: string) => void;
  disabled?: boolean;
}) {
  // "Degree level preliminary exam" reads as "Degree level" on a chip.
  const options = [
    ...exams.map((e) => ({
      id: e.id,
      name: e.name.replace(/ preliminary exam$/i, ""),
    })),
    { id: "", name: "Other" },
  ];
  return (
    <div
      role="radiogroup"
      aria-labelledby="exam-chips-label"
      className="flex flex-wrap gap-2"
    >
      {options.map((exam, i) => {
        const selected = exam.id === value;
        return (
          <button
            key={exam.id || "other"}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(exam.id)}
            onKeyDown={(e) => {
              const step =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!step) return;
              e.preventDefault();
              const next =
                options[(i + step + options.length) % options.length]!;
              onChange(next.id);
              const group = e.currentTarget.parentElement;
              const buttons = group?.querySelectorAll("button");
              buttons?.[(i + step + options.length) % options.length]?.focus();
            }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-small font-medium transition-colors duration-[120ms] disabled:opacity-50",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
              selected
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-border bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink",
            )}
          >
            {selected ? <Check className="size-4" aria-hidden /> : null}
            {exam.name}
          </button>
        );
      })}
    </div>
  );
}
