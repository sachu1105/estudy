import { Gift } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { PublicPlanCards } from "@/features/billing/components/public-plan-cards";
import { featuredPlan, planCards } from "@/server/services/billing/plan-cards";

import { SectionHeading } from "./section-heading";

/** The plans on the landing page: the same cards, limits and featured plan as /pricing. */
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
          <Reveal className="mx-auto mt-8 flex w-fit max-w-xl items-center justify-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-center text-small font-medium text-accent-ink">
            <Gift className="size-4 shrink-0" aria-hidden /> Free during launch,
            except mock tests from your own notes
          </Reveal>
        ) : null}
        <Reveal className="mt-12">
          <PublicPlanCards
            plans={planCards()}
            billingOn={billingEnabled}
            featured={featuredPlan()}
            href={ctaHref}
          />
        </Reveal>
      </div>
    </section>
  );
}
