import { Check, Minus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { blurbs, planLabel, rupees } from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils/cn";

import type { PlanCard } from "./plan-cards";

/** The plans for someone not signed in: read, then register. No checkout here. */
export function PublicPlanCards({
  plans,
  billingOn,
}: {
  plans: PlanCard[];
  billingOn: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map(({ plan, pricePaise, rows }) => (
        <section
          key={plan}
          aria-labelledby={`public-plan-${plan}`}
          className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5"
        >
          <div className="flex flex-col gap-1">
            <h2 id={`public-plan-${plan}`} className="text-h2">
              {planLabel(plan)}
            </h2>
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
          <Button asChild variant="secondary" className="mt-auto w-full">
            <Link href="/register">
              {billingOn && plan !== "FREE"
                ? `Choose ${planLabel(plan).toLowerCase()}`
                : "Start free"}
            </Link>
          </Button>
        </section>
      ))}
    </div>
  );
}
