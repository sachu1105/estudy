import { Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
import {
  blurbs,
  planLabel,
  rupees,
  type FeatureRow,
  type PlanName,
} from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils/cn";

export type PublicPlan = {
  plan: PlanName;
  pricePaise: number;
  rows: FeatureRow[];
};

/**
 * The plans for someone not signed in: read, then register. No checkout here. The
 * featured plan (the admin picks it) is raised, with a cover on top and the one
 * filled button.
 */
export function PublicPlanCards({
  plans,
  billingOn,
  featured,
  href = "/register",
  headingLevel = 3,
}: {
  plans: PublicPlan[];
  billingOn: boolean;
  featured: PlanName;
  href?: string;
  /** 2 on /pricing, where the plans sit right under the page title. */
  headingLevel?: 2 | 3;
}) {
  return (
    // From md each card is a subgrid over shared rows (header, then one row per
    // feature), so the cards end level and the same feature sits on the same line.
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {plans.map((p) => (
        <PlanCard
          key={p.plan}
          {...p}
          featured={p.plan === featured}
          cta={
            billingOn && p.plan !== "FREE"
              ? `Choose ${planLabel(p.plan).toLowerCase()}`
              : "Start free"
          }
          href={href}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  pricePaise,
  rows,
  featured,
  cta,
  href,
  headingLevel,
}: PublicPlan & {
  featured: boolean;
  cta: string;
  href: string;
  headingLevel: 2 | 3;
}) {
  const id = `public-plan-${plan}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      aria-labelledby={id}
      style={
        {
          "--rows": rows.length + 1,
          "--items": rows.length,
        } as React.CSSProperties
      }
      className={cn(
        "flex flex-col gap-5 rounded-[24px] border bg-surface p-2 pb-6 md:row-span-(--rows) md:grid md:grid-rows-subgrid md:gap-y-3",
        featured
          ? "border-accent/40 shadow-lg"
          : "border-border shadow-sm",
      )}
    >
      <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[18px] p-5">
        {featured ? (
          <PodCover
            cover={{ kind: "gradient", preset: "blurple" }}
            className="absolute inset-0 -z-10"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-surface-muted"
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <Heading
            id={id}
            className={cn(
              "font-heading text-h3 font-medium",
              featured ? "text-white" : "text-ink",
            )}
          >
            {planLabel(plan)}
          </Heading>
          {featured ? (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-small font-medium text-white backdrop-blur-sm">
              <Sparkles className="size-3.5" aria-hidden /> Best value
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "flex items-baseline gap-1.5",
            featured ? "text-white" : "text-ink",
          )}
        >
          <span className="font-heading text-[40px] leading-none font-semibold tabular-nums">
            {rupees(pricePaise)}
          </span>
          <span
            className={cn(
              "text-small",
              featured ? "text-white/80" : "text-ink-muted",
            )}
          >
            {pricePaise > 0 ? "a month" : "forever"}
          </span>
        </p>
        <p
          className={cn(
            "text-small",
            featured ? "text-white/85" : "text-ink-muted",
          )}
        >
          {blurbs[plan]}
        </p>
        {/* On the cover a plain raised button reads best; colour is the cover's job. */}
        <Button asChild variant="secondary" size="lg" className="mt-auto w-full">
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
      <ul className="flex flex-col gap-3 px-4 md:row-span-(--items) md:mt-2 md:grid md:grid-rows-subgrid">
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
    </section>
  );
}
