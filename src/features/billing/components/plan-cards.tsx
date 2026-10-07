"use client";

import { Check, Minus } from "lucide-react";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  blurbs,
  planLabel,
  rupees,
  type FeatureRow,
  type PlanName,
} from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils/cn";

import { startCheckoutAction } from "../actions";
import { openCheckout } from "./checkout";

export type PlanCard = {
  plan: PlanName;
  pricePaise: number;
  rows: FeatureRow[];
};

/**
 * The three plans side by side. While billing is off the buttons say so plainly rather
 * than sitting there dead.
 */
export function PlanCards({
  plans,
  current,
  billingOn,
  name,
  email,
}: {
  plans: PlanCard[];
  current: PlanName | null;
  billingOn: boolean;
  name?: string;
  email?: string;
}) {
  const [pending, start] = useTransition();

  const buy = (plan: PlanName) =>
    start(async () => {
      if (plan === "FREE") return;
      const result = await startCheckoutAction({ plan });
      if (!result.ok) return void toast.error(result.error);
      await openCheckout({
        subscriptionId: result.subscriptionId,
        keyId: result.keyId,
        plan,
        name,
        email,
      });
    });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map(({ plan, pricePaise, rows }) => (
        <section
          key={plan}
          aria-labelledby={`plan-${plan}`}
          className={cn(
            "flex flex-col gap-5 rounded-card border bg-surface p-5",
            current === plan ? "border-accent" : "border-border",
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 id={`plan-${plan}`} className="text-h2">
                {planLabel(plan)}
              </h3>
              {current === plan ? <Badge tone="accent">your plan</Badge> : null}
            </div>
            <p className="font-mono text-h3 tabular-nums">
              {rupees(pricePaise)}
              <span className="text-small text-ink-muted">
                {pricePaise > 0 ? " a month" : " forever"}
              </span>
            </p>
            <p className="text-small text-ink-muted">{blurbs[plan]}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <li
                key={row.label}
                className={cn(
                  "flex items-start gap-2.5 text-small",
                  row.on ? "text-ink" : "text-ink-muted",
                )}
              >
                {row.on ? (
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-accent"
                    aria-label="Included"
                  />
                ) : (
                  <Minus
                    className="mt-0.5 size-4 shrink-0"
                    aria-label="Not included"
                  />
                )}
                {row.label}
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            {plan === "FREE" || current === plan ? (
              <p className="text-small text-ink-muted">
                {current === plan ? "You're on this plan." : "Always free."}
              </p>
            ) : billingOn ? (
              <Button
                variant={plan === "PRO" ? "primary" : "secondary"}
                className="w-full"
                disabled={pending}
                onClick={() => buy(plan)}
              >
                Upgrade to {planLabel(plan)}
              </Button>
            ) : (
              <p className="text-small text-ink-muted">
                Free during launch. Payments open later.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
