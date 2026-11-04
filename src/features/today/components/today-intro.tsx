"use client";

import { CircleCheck, Play, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";

import { TODAY_INTRO_COOKIE } from "../intro";

const STEPS = [
  { icon: Play, title: "Start", text: "Study the next topic with a timer" },
  { icon: CircleCheck, title: "Tick", text: "Tick it off when you finish" },
  {
    icon: RefreshCw,
    title: "Adapt",
    text: "Next week's plan makes room for the rest",
  },
];

/**
 * Three steps for anyone who opens Today and wonders what it is. Gone once dismissed; the
 * cookie lets the server leave it out, so the page never jumps on load.
 */
export function TodayIntro() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const dismiss = () => {
    document.cookie = `${TODAY_INTRO_COOKIE}=hidden; path=/; max-age=31536000; samesite=lax`;
    setHidden(true);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-h3">How Today works</h2>
        <button
          type="button"
          onClick={dismiss}
          className="-m-2 grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink md:size-9"
          aria-label="Hide how Today works"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-small font-medium text-ink">{title}</span>
              <span className="text-small text-ink-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
