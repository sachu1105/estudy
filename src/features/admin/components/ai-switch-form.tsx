"use client";

import { useState } from "react";

import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AI_JOBS, type AiJob } from "@/lib/settings/schemas";

import { useSaveSetting } from "./use-save-setting";

const card =
  "flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5";

/**
 * The AI master switch, and one switch per AI job under it. Off: syllabuses are read by
 * their headings and lists and nothing calls a model or costs money. Each switch saves at
 * once; the worker reads it again for every job.
 */
export function AiSwitchForm({
  initial,
}: {
  initial: { enabled: boolean; jobs: Record<AiJob, boolean> };
}) {
  const [value, setValue] = useState(initial);
  const { save, pending } = useSaveSetting("ai");
  const update = (next: typeof value, done: string) => {
    setValue(next);
    save(next, done);
  };
  return (
    <section className={card} aria-labelledby="ai-switch">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="ai-switch" className="text-h3">
            AI
          </h2>
          <p className="text-small text-ink-muted">
            {value.enabled
              ? "On. The jobs switched on below call the model set up on this page. Each call's cost is logged under Jobs and AI."
              : "Off. Syllabuses are read by their headings and lists, with no AI and no cost. Plans, tests and progress never use AI."}
          </p>
        </div>
        <Switch
          aria-labelledby="ai-switch"
          checked={value.enabled}
          disabled={pending}
          onCheckedChange={(enabled) =>
            update(
              { ...value, enabled },
              enabled ? "AI is on" : "AI is off. Nothing calls a model now",
            )
          }
        />
      </div>
      <ul className="flex flex-col divide-y divide-border border-t border-border">
        {(Object.entries(AI_JOBS) as [AiJob, (typeof AI_JOBS)[AiJob]][]).map(
          ([job, { label, built }]) => (
            <li
              key={job}
              className="flex min-h-12 items-center justify-between gap-4 py-2"
            >
              <Label
                htmlFor={`ai-job-${job}`}
                className="flex flex-col gap-0.5"
              >
                <span>{label}</span>
                {!built ? (
                  <span className="text-small font-normal text-ink-muted">
                    Not built yet
                  </span>
                ) : null}
              </Label>
              <Switch
                id={`ai-job-${job}`}
                checked={built && value.enabled && value.jobs[job]}
                disabled={pending || !built || !value.enabled}
                onCheckedChange={(on) =>
                  update(
                    { ...value, jobs: { ...value.jobs, [job]: on } },
                    on ? `${label}: on` : `${label}: off`,
                  )
                }
              />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
