"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import type { CoverageWarning as Warning } from "@/lib/plan-engine";
import {
  daysLeft,
  MAX_DAY_MINUTES,
  planEnd,
  type DraftSharing,
  type PlanDraft,
} from "@/lib/plans/draft";
import { formatDay, formatMinutes } from "@/lib/plans/format";

import { generatePlanAction, savePlanDraftAction } from "../actions";
import { useShare } from "../use-share";
import { CoverageWarning } from "./coverage-warning";
import { StepFooter } from "./step-footer";

const WINDOW_NAMES = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening",
  NIGHT: "night",
};

/** Step 4: what the plan will use, then the engine runs. */
export function ReviewStep({
  draftId,
  initial,
  today,
  subjects,
  sharing,
}: {
  draftId: string;
  initial: PlanDraft;
  today: string;
  subjects: number;
  sharing: DraftSharing;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  // Offered, never done for them: an exam sat sooner is usually the one to lead, but it is
  // the user's call which exam their days belong to.
  const [takeFocus, setTakeFocus] = useState(false);
  const share = useShare(sharing, draft.minutesByWeekday);
  const [warning, setWarning] = useState<{
    warning: Warning;
    extraDays: number;
  } | null>(null);
  const [busy, start] = useTransition();
  const end = planEnd(draft, today);
  const studyDays = draft.minutesByWeekday.filter((m) => m > 0).length || 1;
  const extraPerStudyDay = warning
    ? Math.ceil((warning.warning.extraMinutesPerDay * 7) / studyDays / 5) * 5
    : 0;

  const run = (fit: "ALL" | "PARTIAL", next: PlanDraft = draft) =>
    start(async () => {
      if (next !== draft) {
        const saved = await savePlanDraftAction({ draftId, data: next });
        if (!saved.ok) return void toast.error(saved.error);
        setDraft(next);
      }
      const result = await generatePlanAction({
        draftId,
        fit,
        focus: takeFocus,
      });
      if (!result.ok) return void toast.error(result.error);
      if (result.outcome === "WARNING") {
        setWarning({ warning: result.warning, extraDays: result.extraDays });
        return;
      }
      router.push(`/plan/${result.planId}?new=1`);
    });

  const addTime = () =>
    run("ALL", {
      ...draft,
      minutesByWeekday: draft.minutesByWeekday.map((m) =>
        m > 0 ? Math.min(MAX_DAY_MINUTES, m + extraPerStudyDay) : m,
      ),
    });

  const rows: [string, string][] = [
    [
      "Plan ends",
      end ? `${formatDay(end)}, in ${daysLeft(draft, today)} days` : "Not set",
    ],
    [
      "Time",
      share.shared
        ? `${formatMinutes(share.mineWeekly)} a week, your share of ${formatMinutes(
            draft.minutesByWeekday.reduce((a, b) => a + b, 0),
          )}`
        : `${formatMinutes(draft.minutesByWeekday.reduce((a, b) => a + b, 0))} a week`,
    ],
    [
      "Best time",
      draft.preferredWindows.map((w) => WINDOW_NAMES[w]).join(", then "),
    ],
    ["Subjects", `${subjects}, in your board's order`],
    ["New to PSC", draft.beginnerMode ? "Yes: gentler first week" : "No"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <dl className="divide-y divide-border rounded-card border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4"
          >
            <dt className="text-small text-ink-muted sm:w-32 sm:shrink-0">
              {label}
            </dt>
            <dd className="text-body first-letter:uppercase">{value}</dd>
          </div>
        ))}
      </dl>
      {sharing.shouldLead ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4">
          <Checkbox
            checked={takeFocus}
            onCheckedChange={(on) => setTakeFocus(on === true)}
            aria-describedby="focus-why"
          />
          <span className="flex flex-col gap-1">
            <span className="text-body font-medium">
              Make this exam my focus
            </span>
            <span id="focus-why" className="text-small text-ink-muted">
              It comes before {sharing.shouldLead.title}, which leads your days
              at the moment. Your focus gets the bigger share of every day, and
              Today starts with it. You can swap them whenever you like.
            </span>
          </span>
        </label>
      ) : null}

      <p className="text-small text-ink-muted">
        The plan is worked out by a fixed set of rules, not AI. Every task will
        show why it&apos;s there, and you can change any of it.
      </p>

      {warning ? (
        <CoverageWarning
          warning={warning.warning}
          extraDays={warning.extraDays}
          extraPerStudyDay={extraPerStudyDay}
          busy={busy}
          onAddTime={addTime}
          onPartial={() => run("PARTIAL")}
          onMoveDate={() => router.push(`/plan/new/${draftId}/timeline`)}
        />
      ) : null}

      <StepFooter
        onBack={() => router.push(`/plan/new/${draftId}/subjects`)}
        onNext={() => run("ALL")}
        nextLabel={busy ? "Building your plan" : "Build my plan"}
        busy={busy || warning !== null}
        problem={warning ? "Pick one of the options above." : null}
        saveState="idle"
        saveError={null}
      />
    </div>
  );
}
