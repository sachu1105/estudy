"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { TimeWindow } from "@/lib/plan-engine";
import {
  MAX_DAY_MINUTES,
  stepProblem,
  type PlanDraft,
} from "@/lib/plans/draft";
import { formatMinutes } from "@/lib/plans/format";

import { usePlanDraft } from "../use-plan-draft";
import { StepFooter } from "./step-footer";

const PRESETS: { label: string; minutes: number[] }[] = [
  { label: "1 h a day", minutes: [60, 60, 60, 60, 60, 60, 60] },
  { label: "2 h a day", minutes: [120, 120, 120, 120, 120, 120, 120] },
  {
    label: "2 h weekdays, 4 h weekends",
    minutes: [240, 120, 120, 120, 120, 120, 240],
  },
  { label: "Weekends only", minutes: [300, 0, 0, 0, 0, 0, 300] },
];
// Monday first on screen; the engine counts from Sunday.
const WEEK = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;
const WINDOWS: [TimeWindow, string][] = [
  ["MORNING", "Morning"],
  ["AFTERNOON", "Afternoon"],
  ["EVENING", "Evening"],
  ["NIGHT", "Night"],
];
const STEP = 15;

/** Step 2: minutes for each weekday, and the times of day the user likes to study. */
export function TimeStep({
  draftId,
  initial,
  today,
}: {
  draftId: string;
  initial: PlanDraft;
  today: string;
}) {
  const { draft, update, state, error, goTo, moving } = usePlanDraft(
    draftId,
    initial,
  );
  const week = draft.minutesByWeekday.reduce((a, b) => a + b, 0);

  const setDay = (day: number, minutes: number) =>
    update({
      minutesByWeekday: draft.minutesByWeekday.map((m, i) =>
        i === day ? Math.min(MAX_DAY_MINUTES, Math.max(0, minutes)) : m,
      ),
    });
  const toggleWindow = (w: TimeWindow) => {
    const on = draft.preferredWindows.includes(w);
    if (on && draft.preferredWindows.length === 1) return;
    update({
      preferredWindows: on
        ? draft.preferredWindows.filter((x) => x !== w)
        : [...draft.preferredWindows, w],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-h3">How much time do you have?</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              selected={p.minutes.every(
                (m, i) => m === draft.minutesByWeekday[i],
              )}
              onClick={() => update({ minutesByWeekday: p.minutes })}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {WEEK.map(([day, name]) => {
            const minutes = draft.minutesByWeekday[day];
            return (
              <li key={day} className="flex items-center gap-2 px-3 py-1">
                <span className="min-w-0 flex-1 text-body">{name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Less time on ${name}`}
                  disabled={minutes === 0}
                  onClick={() => setDay(day, minutes - STEP)}
                >
                  <Minus aria-hidden />
                </Button>
                <span
                  className="w-24 text-center font-mono text-body tabular-nums"
                  aria-live="polite"
                  aria-label={`${name}: ${minutes === 0 ? "rest day" : formatMinutes(minutes)}`}
                >
                  {minutes === 0 ? "Rest" : formatMinutes(minutes)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`More time on ${name}`}
                  disabled={minutes >= MAX_DAY_MINUTES}
                  onClick={() => setDay(day, minutes + STEP)}
                >
                  <Plus aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="text-small text-ink-muted">
          {formatMinutes(week)} a week. The plan keeps 10% of it free for life.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3">When do you like to study?</h2>
        <p className="text-small text-ink-muted">
          Pick in order of preference. Your weakest subjects get the earliest of
          these.
        </p>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map(([w, label]) => {
            const rank = draft.preferredWindows.indexOf(w);
            return (
              <Chip
                key={w}
                selected={rank >= 0}
                onClick={() => toggleWindow(w)}
              >
                {rank >= 0 ? (
                  <span className="font-mono tabular-nums">{rank + 1}</span>
                ) : null}
                {label}
              </Chip>
            );
          })}
        </div>
      </section>

      <StepFooter
        onBack={() => goTo(`/plan/new/${draftId}/timeline`)}
        onNext={() => goTo(`/plan/new/${draftId}/subjects`)}
        busy={moving}
        problem={stepProblem("time", draft, today)}
        saveState={state}
        saveError={error}
      />
    </div>
  );
}
