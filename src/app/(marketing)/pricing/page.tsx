import { Gift } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PublicPlanCards } from "@/features/billing/components/public-plan-cards";
import { billingEnabled } from "@/server/entitlements";
import { featuredPlan, planCards } from "@/server/services/billing/plan-cards";
import { loadSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free. Upgrade only when you hit a limit. Every plan keeps your notes, tests and progress.",
};

/** The plans in full, straight from the entitlements table. */
export default async function PricingPage() {
  await loadSettings();
  const on = billingEnabled();
  return (
    <div className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24">
      <h1 className="text-display">Pricing</h1>
      <p className="mt-3 max-w-xl text-body text-ink-muted">
        Start free and upgrade only when you reach a limit. Whatever happens to
        your plan, your notes, tests and progress stay.
      </p>
      {!on ? (
        <p className="mt-6 flex max-w-xl items-start gap-2 rounded-card bg-accent-soft p-4 text-body text-accent-ink">
          <Gift className="mt-0.5 size-4 shrink-0" aria-hidden />
          Free during launch: every Elite feature is open, except mock tests
          from your own material.
        </p>
      ) : null}
      <div className="mt-8">
        <PublicPlanCards
          plans={planCards()}
          billingOn={on}
          featured={featuredPlan()}
          headingLevel={2}
        />
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <h2 className="text-h2">Questions</h2>
        <dl className="flex max-w-2xl flex-col gap-4 text-body">
          <div>
            <dt className="font-medium">What happens if I stop paying?</dt>
            <dd className="text-ink-muted">
              You drop to Free. Nothing is deleted: anything over the free
              limits stays and becomes read-only until you upgrade again.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Can I cancel any time?</dt>
            <dd className="text-ink-muted">
              Yes. Your plan keeps working until the end of the period you have
              already paid for.
            </dd>
          </div>
          <div>
            <dt className="font-medium">
              What is a mock test from my material?
            </dt>
            <dd className="text-ink-muted">
              Questions written from the notes, photos and PDFs you saved in
              your own pods. They stay private to you.
            </dd>
          </div>
        </dl>
      </div>
      <Button asChild variant="primary" size="lg" className="mt-8">
        <Link href="/register">Start free</Link>
      </Button>
    </div>
  );
}
