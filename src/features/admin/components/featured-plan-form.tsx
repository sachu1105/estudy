"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { planLabel, type PlanName } from "@/lib/pricing/pricing";

import { useSaveSetting } from "./use-save-setting";

const PLANS: PlanName[] = ["FREE", "PRO", "ELITE"];

/** Which plan the public pricing cards lift up, with its colour and "Best value" tag. */
export function FeaturedPlanForm({ initial }: { initial: PlanName }) {
  const [plan, setPlan] = useState(initial);
  const { save, pending } = useSaveSetting("featuredPlan");
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-h3">
          <Sparkles className="size-4 text-accent" aria-hidden /> Featured plan
        </h2>
        <p className="text-small text-ink-muted">
          The plan shown raised on the landing page and the pricing page, tagged
          &quot;Best value&quot;.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<PlanName>
          ariaLabel="Featured plan"
          value={plan}
          onValueChange={setPlan}
          options={PLANS.map((p) => ({ value: p, label: planLabel(p) }))}
        />
        <Button
          variant="secondary"
          disabled={pending || plan === initial}
          onClick={() =>
            save({ plan }, `${planLabel(plan)} is the featured plan`)
          }
        >
          Save
        </Button>
      </div>
    </section>
  );
}
