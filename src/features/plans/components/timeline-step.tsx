"use client";

import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addDays } from "@/lib/plan-engine";
import {
  DAY_PRESETS,
  daysLeft,
  planEnd,
  stepProblem,
  type PlanDraft,
} from "@/lib/plans/draft";
import { formatDay } from "@/lib/plans/format";

import { usePlanDraft } from "../use-plan-draft";
import { StepFooter } from "./step-footer";

/** Step 1: how long there is, and whether the user is new to PSC. */
export function TimelineStep({
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
  const end = planEnd(draft, today);
  const days = daysLeft(draft, today);

  const setBeginner = (on: boolean) =>
    update({
      beginnerMode: on,
      // A beginner starts every subject at confidence 1 (product rules).
      ...(on
        ? {
            subjects: Object.fromEntries(
              Object.entries(draft.subjects).map(([id, s]) => [
                id,
                { ...s, confidence: 1 },
              ]),
            ),
          }
        : {}),
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-start gap-4 rounded-card border border-border bg-surface p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor="beginner">I&apos;m new to PSC</Label>
          <p className="text-small text-ink-muted">
            A gentler start: 25-minute blocks in the first week, basics first,
            and every subject starts at confidence 1.
          </p>
        </div>
        <Switch
          id="beginner"
          checked={draft.beginnerMode}
          onCheckedChange={setBeginner}
        />
      </section>

      <section className="flex flex-col gap-3">
        <Label htmlFor="exam-date">When is your exam?</Label>
        <Input
          id="exam-date"
          type="date"
          min={addDays(today, 1)}
          value={draft.examDate ?? ""}
          onChange={(e) => update({ examDate: e.target.value || null })}
          className="max-w-60"
        />
      </section>

      <section className="flex flex-col gap-3">
        <Label htmlFor="target-days">Or finish in</Label>
        <div className="flex flex-wrap gap-2">
          {DAY_PRESETS.map((n) => (
            <Chip
              key={n}
              selected={draft.targetDays === n}
              onClick={() =>
                update({ targetDays: draft.targetDays === n ? null : n })
              }
            >
              {n} days
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="target-days"
            type="number"
            inputMode="numeric"
            min={7}
            max={730}
            value={draft.targetDays ?? ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              update({
                targetDays: Number.isFinite(n)
                  ? Math.min(730, Math.max(7, n))
                  : null,
              });
            }}
            className="w-28"
          />
          <span className="text-body text-ink-muted">days</span>
        </div>
        <p className="text-small text-ink-muted">
          Give both and the earlier one wins.
        </p>
      </section>

      {end ? (
        <p
          className="rounded-card bg-surface-muted p-4 text-body"
          aria-live="polite"
        >
          <span className="font-mono font-medium tabular-nums">{days}</span>{" "}
          days of study. Your plan ends on {formatDay(end)}.
        </p>
      ) : null}

      <StepFooter
        onNext={() => goTo(`/plan/new/${draftId}/time`)}
        busy={moving}
        problem={stepProblem("timeline", draft, today)}
        saveState={state}
        saveError={error}
      />
    </div>
  );
}
