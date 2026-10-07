import { Check, FileText, Link2, NotebookPen, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// One subject pod, as a user's looks a few weeks in. Illustrative, not data.
const topics: [string, boolean][] = [
  ["Preamble and its features", true],
  ["Fundamental rights", true],
  ["Directive principles", true],
  ["Fundamental duties", false],
  ["Parliament and its powers", false],
];

const material = [
  { icon: NotebookPen, label: "My notes · Preamble", meta: "Note" },
  { icon: FileText, label: "Fundamental rights.pdf", meta: "PDF · 2 MB" },
  { icon: Link2, label: "Articles 12 to 35, explained", meta: "Link" },
];

/** The hero's product window: a subject pod with its topics and material. */
export function HeroWindow() {
  return (
    <div
      role="img"
      aria-label="A subject pod for Indian Constitution: 3 of 5 topics done, with notes, a PDF and a link saved under its topics, and a button to make a mock test from them"
      className="mx-auto max-w-4xl translate-y-px rounded-t-[20px] border border-b-0 border-white/40 bg-surface shadow-lg"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="truncate text-small text-ink-muted">
          Pods / Prelims 2026 /{" "}
          <span className="font-medium text-ink">Indian Constitution</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-body font-medium text-ink">
              Topics
            </p>
            <p className="font-mono text-small text-ink-muted tabular-nums">
              3/5
            </p>
          </div>
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full w-3/5 rounded-full bg-accent" />
          </span>
          <ul className="flex flex-col">
            {topics.map(([name, done]) => (
              <li
                key={name}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-[6px] border",
                    done
                      ? "border-success bg-success text-white"
                      : "border-border",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : null}
                </span>
                <span
                  className={cn(
                    "truncate text-small",
                    done ? "text-ink-muted" : "text-ink",
                  )}
                >
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden flex-col gap-3 md:flex">
          <p className="font-heading text-body font-medium text-ink">
            Material
          </p>
          <ul className="flex flex-col gap-2">
            {material.map((m) => (
              <li
                key={m.label}
                className="flex items-center gap-3 rounded-control border border-border p-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-surface-muted text-ink-muted">
                  <m.icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-small text-ink">
                    {m.label}
                  </span>
                  <span className="text-micro text-ink-muted">{m.meta}</span>
                </span>
              </li>
            ))}
          </ul>
          <span className="mt-1 flex items-center justify-center gap-2 rounded-control border border-accent/30 bg-accent-soft px-3 py-2.5 text-small font-medium text-accent-ink">
            <Sparkles className="size-4" /> Make a mock test from these
          </span>
        </div>
      </div>
    </div>
  );
}
