"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SaveIndicator } from "@/features/syllabus/components/save-indicator";

import type { DraftSaveState } from "../use-plan-draft";

/**
 * Back and next for a setup step, in thumb reach: it sticks to the bottom of the screen,
 * above the tab bar on phones. `problem` explains why next is off.
 */
export function StepFooter({
  onBack,
  onNext,
  nextLabel = "Next",
  busy,
  problem,
  saveState,
  saveError,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy: boolean;
  problem: string | null;
  saveState: DraftSaveState;
  saveError: string | null;
}) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-8 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-card md:border md:px-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} disabled={busy}>
            <ArrowLeft aria-hidden /> Back
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          {problem ? (
            <p className="text-small text-ink-muted">{problem}</p>
          ) : (
            <SaveIndicator state={saveState} error={saveError} />
          )}
        </div>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={busy || problem !== null}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
