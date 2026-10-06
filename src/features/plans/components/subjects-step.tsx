"use client";

import { AlertCircle, Check } from "lucide-react";
import Link from "next/link";

import type { PodStage } from "@/lib/pods/stages";
import {
  estimate,
  type EstimateTopic,
  type PlanDraft,
} from "@/lib/plans/draft";

import { usePlanDraft } from "../use-plan-draft";
import { StepFooter } from "./step-footer";
import { SubjectSetting } from "./subject-setting";

export type StepSubject = {
  id: string;
  name: string;
  stage: PodStage;
  topics: EstimateTopic[];
};

/** Step 3: confidence and intensity per subject, in board order, with a live estimate. */
export function SubjectsStep({
  draftId,
  syllabusId,
  initial,
  today,
  subjects,
}: {
  draftId: string;
  syllabusId: string;
  initial: PlanDraft;
  today: string;
  subjects: StepSubject[];
}) {
  const { draft, update, state, error, goTo, moving } = usePlanDraft(
    draftId,
    initial,
  );
  const { neededHours, availableHours, days } = estimate(
    draft,
    today,
    subjects,
  );
  const fits = neededHours <= availableHours;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex items-start gap-3 rounded-card bg-surface-muted p-4"
        aria-live="polite"
      >
        {fits ? (
          <Check
            className="mt-0.5 size-5 shrink-0 text-ink-muted"
            aria-hidden
          />
        ) : (
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-ink-muted"
            aria-hidden
          />
        )}
        <p className="text-body">
          This needs about{" "}
          <span className="font-mono font-medium tabular-nums">
            {neededHours} h
          </span>
          . You have about{" "}
          <span className="font-mono font-medium tabular-nums">
            {availableHours} h
          </span>{" "}
          in {days} days.{" "}
          {fits
            ? "That fits."
            : "That's tight; the next step shows your options."}
        </p>
      </div>

      <p className="text-body text-ink-muted">
        In the order of your exam board.{" "}
        <Link
          href={`/pods/exam/${syllabusId}`}
          className="font-medium text-accent-ink hover:underline"
        >
          Change it on the board
        </Link>
      </p>

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {subjects.map((s) => (
          <li key={s.id}>
            <SubjectSetting
              name={s.name}
              stage={s.stage}
              topics={s.topics.length}
              topicsDone={s.topics.filter((t) => t.done).length}
              setting={draft.subjects[s.id]}
              onChange={(setting) =>
                update({ subjects: { ...draft.subjects, [s.id]: setting } })
              }
            />
          </li>
        ))}
      </ul>

      <StepFooter
        onBack={() => goTo(`/plan/new/${draftId}/time`)}
        onNext={() => goTo(`/plan/new/${draftId}/review`)}
        busy={moving}
        problem={null}
        saveState={state}
        saveError={error}
      />
    </div>
  );
}
