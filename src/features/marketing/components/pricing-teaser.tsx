import { Check, Gift, Minus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";
import { featureRows, blurbs, planLabel, rupees } from "@/lib/pricing/pricing";
import {
  PLANS,
  planConfig,
  planPricePaise,
} from "@/server/entitlements/config";

import { SectionHeading } from "./section-heading";

export function PricingTeaser({
  billingEnabled,
  ctaHref,
}: {
  billingEnabled: boolean;
  ctaHref: string;
}) {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24">
        <Reveal>
          <SectionHeading
            id="pricing-title"
            eyebrow="Pricing"
            title="Start free, upgrade only if you need to"
          />
        </Reveal>
        {!billingEnabled ? (
          <Reveal className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 rounded-control bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-ink">
            <Gift className="size-4 shrink-0" aria-hidden /> Free during launch,
            except mock tests from your own notes
          </Reveal>
        ) : null}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Reveal
              key={plan}
              className="flex flex-col gap-5 rounded-card border border-border bg-bg p-5 sm:p-6"
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-h2">{planLabel(plan)}</h3>
                <p className="font-mono text-h3 tabular-nums">
                  {rupees(planPricePaise[plan])}
                  <span className="text-small text-ink-muted">
                    {planPricePaise[plan] > 0 ? " a month" : " forever"}
                  </span>
                </p>
                <p className="text-small text-ink-muted">{blurbs[plan]}</p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {featureRows(planConfig[plan]).map((row) => (
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
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="mt-auto w-full"
              >
                <Link href={ctaHref}>
                  {billingEnabled
                    ? `Choose ${plan.toLowerCase()}`
                    : "Start free"}
                </Link>
              </Button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
