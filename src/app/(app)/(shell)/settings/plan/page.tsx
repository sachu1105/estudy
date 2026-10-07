import { Gift } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { CancelPlan } from "@/features/billing/components/cancel-plan";
import { PlanCards } from "@/features/billing/components/plan-cards";
import { BackLink } from "@/features/pods/components/back-link";
import { formatWhen } from "@/lib/admin/format";
import type { PlanName } from "@/lib/pricing/pricing";
import { requireUser } from "@/server/auth/session";
import { billingEnabled, planOf } from "@/server/entitlements";
import { billingService } from "@/server/services/billing";
import { planCards } from "@/server/services/billing/plan-cards";

export const metadata: Metadata = { title: "Your plan" };

/** What the person is on now, what the plans give, and how to change. */
export default async function PlanPage() {
  const user = await requireUser();
  const [subscription, on] = await Promise.all([
    billingService.current(user),
    Promise.resolve(billingEnabled()),
  ]);
  const effective = planOf(user) as PlanName;
  const paid =
    subscription && subscription.plan !== "FREE" ? subscription : null;

  return (
    <>
      <BackLink href="/settings" label="Settings" />
      <PageHeader
        title="Your plan"
        description={
          on
            ? "Change plan at any time. Nothing you have made is ever deleted."
            : "Everything is free while we launch."
        }
      />
      <div className="flex flex-col gap-6">
        {!on ? (
          <p className="flex max-w-xl items-start gap-2 rounded-card bg-accent-soft p-4 text-body text-accent-ink">
            <Gift className="mt-0.5 size-4 shrink-0" aria-hidden />
            Free during launch: you have every Elite feature, except mock tests
            from your own material, which opens when payments do.
          </p>
        ) : null}
        {paid ? (
          <section
            aria-labelledby="current"
            className="flex max-w-xl flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <h2 id="current" className="text-h3">
              Current subscription
            </h2>
            <p className="text-body text-ink-muted">
              {paid.plan} ·{" "}
              {paid.status === "PAST_DUE"
                ? `payment failed, your plan keeps working until ${formatWhen(paid.graceUntil)}`
                : paid.cancelAtPeriodEnd
                  ? `ends ${formatWhen(paid.periodEnd)}`
                  : `renews ${formatWhen(paid.periodEnd)}`}
            </p>
            {paid.cancelAtPeriodEnd ? null : <CancelPlan />}
          </section>
        ) : null}
        <PlanCards
          plans={planCards()}
          current={effective}
          billingOn={on}
          name={user.name}
          email={user.email}
        />
        <p className="max-w-xl text-small text-ink-muted">
          If a plan ends, nothing of yours is deleted. Anything over the new
          limits stays and becomes read-only until you upgrade again.
        </p>
      </div>
    </>
  );
}
