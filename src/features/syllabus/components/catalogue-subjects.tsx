"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

type Subject = {
  id: string;
  name: string;
  topics: {
    id: string;
    name: string;
    weight: number;
    difficulty: number;
    foundational: boolean;
  }[];
};

/** A 1-5 level as five dots; the number is read out, not the dots. */
function Dots({ value, label }: { value: number; label: string }) {
  return (
    <span
      role="img"
      aria-label={`${label} ${value} of 5`}
      className="flex w-18 shrink-0 justify-end gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            "size-1.5 rounded-full",
            n <= value ? "bg-ink-muted" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

/**
 * A catalogue syllabus's subjects, one line each, with a bar for its share of the exam
 * (topics x weight). Open one to see its topics, with weight and difficulty under shared
 * column headings. One open at a time keeps a 17-subject syllabus to a screen.
 */
export function CatalogueSubjects({ subjects }: { subjects: Subject[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const share = subjects.map((s) => s.topics.reduce((n, t) => n + t.weight, 0));
  const top = Math.max(1, ...share);

  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {subjects.map((subject, i) => {
        const expanded = open === subject.id;
        const panel = `subject-${subject.id}`;
        return (
          <li key={subject.id}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panel}
              onClick={() => setOpen(expanded ? null : subject.id)}
              className={cn(
                "flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-muted",
                i === 0 && "rounded-t-card",
                i === subjects.length - 1 && !expanded && "rounded-b-card",
                expanded &&
                  "sticky top-16 z-10 border-b border-border bg-surface/95 backdrop-blur md:top-0",
              )}
            >
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms]",
                  expanded && "rotate-90",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-heading text-body font-medium text-ink">
                    {subject.name}
                  </span>
                  <span className="shrink-0 font-mono text-small text-ink-muted tabular-nums">
                    {subject.topics.length}
                    <span className="font-sans"> topics</span>
                  </span>
                </span>
                {/* Its share of the exam, next to the biggest subject. */}
                <span
                  aria-hidden
                  className="h-1 overflow-hidden rounded-full bg-surface-muted"
                >
                  <span
                    className="block h-full rounded-full bg-accent/70"
                    style={{ width: `${(share[i]! / top) * 100}%` }}
                  />
                </span>
              </span>
            </button>
            {expanded ? (
              <div id={panel} className="pb-2">
                <div className="flex items-center gap-3 px-4 pt-3 pb-1 pl-11 text-micro text-ink-muted uppercase">
                  <span className="flex-1">Topic</span>
                  <span className="w-18 text-right">Weight</span>
                  <span className="hidden w-18 text-right sm:block">
                    Difficulty
                  </span>
                </div>
                <ul>
                  {subject.topics.map((t) => (
                    <li
                      key={t.id}
                      className="flex min-h-11 items-center gap-3 px-4 py-2 pl-11"
                    >
                      <span className="min-w-0 flex-1 text-body break-words">
                        {t.name}
                        {t.foundational ? (
                          <span className="ml-2 rounded-chip bg-accent-soft px-1.5 py-0.5 text-small text-accent-ink">
                            basic
                          </span>
                        ) : null}
                      </span>
                      <Dots value={t.weight} label="Weight" />
                      <span className="hidden sm:block">
                        <Dots value={t.difficulty} label="Difficulty" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
