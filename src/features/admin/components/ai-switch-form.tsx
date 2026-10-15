"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";

import { useSaveSetting } from "./use-save-setting";

/**
 * The AI master switch. Off: syllabuses are read by their headings and lists and every
 * other feature runs on plain algorithms; nothing calls a model or costs money. On: new
 * uploads are read by the configured model, and older readings can be read again.
 */
export function AiSwitchForm({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const { save, pending } = useSaveSetting("ai");
  return (
    <section
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5"
      aria-labelledby="ai-switch"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="ai-switch" className="text-h3">
            AI
          </h2>
          <p className="text-small text-ink-muted">
            {on
              ? "On. New syllabus uploads are read by the AI model, and each call's cost is logged under Jobs and AI."
              : "Off. Syllabuses are read by their headings and lists, with no AI and no cost. Plans, tests and progress never use AI."}
          </p>
        </div>
        <Switch
          aria-labelledby="ai-switch"
          checked={on}
          disabled={pending}
          onCheckedChange={(next) => {
            setOn(next);
            save(
              { enabled: next },
              next ? "AI is on" : "AI is off. Nothing calls a model now",
            );
          }}
        />
      </div>
    </section>
  );
}
