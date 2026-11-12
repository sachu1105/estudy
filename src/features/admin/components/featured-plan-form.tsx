"use client";

import { useState } from "react";

import { Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { planLabel, type PlanName } from "@/lib/pricing/pricing";

import { useSaveSetting } from "./use-save-setting";

const PLANS: PlanName[] = ["FREE", "PRO", "ELITE"];

/**
 * Which plan the public pricing cards lift up, with its cover, its "Best value" tag and
 * the shine. Saves as it is picked.
 */
export function FeaturedPlanForm({ initial }: { initial: PlanName }) {
  const [plan, setPlan] = useState(initial);
  const { save, pending } = useSaveSetting("featuredPlan");
  return (
    <div className="flex flex-col gap-2">
      <Label id="featured-plan-label" className="text-body">
        Featured plan
      </Label>
      <p className="text-small text-ink-muted">
        Shown raised on the landing and pricing pages, tagged &quot;Best
        value&quot;.
      </p>
      <SegmentedControl<PlanName>
        ariaLabel="Featured plan"
        className="mt-1 self-start"
        value={plan}
        onValueChange={(next) => {
          if (pending || next === plan) return;
          const before = plan;
          setPlan(next);
          save({ plan: next }, `${planLabel(next)} is the featured plan`, {
            failed: () => setPlan(before),
          });
        }}
        options={PLANS.map((p) => ({ value: p, label: planLabel(p) }))}
      />
    </div>
  );
}
