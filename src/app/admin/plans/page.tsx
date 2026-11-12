import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { BillingForm } from "@/features/admin/components/billing-form";
import { FeaturedPlanForm } from "@/features/admin/components/featured-plan-form";
import { PaidSquadsForm } from "@/features/admin/components/paid-squads-form";
import { PlanPricesForm } from "@/features/admin/components/plan-prices-form";
import {
  PlansForm,
  type PlanTable,
} from "@/features/admin/components/plans-form";
import { PAID_ONLY, billingEnabled, planConfig } from "@/server/entitlements";
import { planPricePaise } from "@/server/entitlements/config";
import { effectivePlans, effectivePrices } from "@/server/entitlements/resolve";
import { env } from "@/server/env";
import { requireAdmin } from "@/server/services/admin";
import { loadSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Plans and limits · Admin" };

/** JSON has no Infinity: unlimited travels as null. */
const toTable = (plans: typeof planConfig): PlanTable =>
  Object.fromEntries(
    Object.entries(plans).map(([plan, c]) => [
      plan,
      {
        limits: Object.fromEntries(
          Object.entries(c.limits).map(([f, v]) => [
            f,
            Number.isFinite(v) ? v : null,
          ]),
        ),
        flags: { ...c.flags },
      },
    ]),
  ) as PlanTable;

/** One part of the page: a heading in plain words, then its card. */
function Part({
  id,
  title,
  description,
  bare = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  /** Its own cards inside: no card around them. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        <p className="text-small text-ink-muted">{description}</p>
      </div>
      {bare ? (
        children
      ) : (
        <div className="rounded-card border border-border bg-surface p-4 md:p-5">
          {children}
        </div>
      )}
    </section>
  );
}

export default async function AdminPlans() {
  await requireAdmin("plans");
  const settings = await loadSettings(true);
  const prices = effectivePrices(settings.planPrices);
  const billing = billingEnabled();
  return (
    <>
      <PageHeader
        title="Plans and limits"
        description="What Free, Pro and Elite include and cost. Changes reach everyone within 30 seconds."
      />
      <div className="flex flex-col gap-10">
        <Part
          id="switches"
          title="Site switches"
          description="These save as you flip them."
        >
          <div className="flex flex-col divide-y divide-border">
            <BillingForm enabled={billing} />
            <PaidSquadsForm enabled={settings.paidSquads?.enabled ?? false} />
          </div>
        </Part>
        <Part
          id="pricing"
          title="Pricing page"
          description="What people see before they sign up."
        >
          <div className="flex flex-col gap-6">
            <FeaturedPlanForm initial={settings.featuredPlan?.plan ?? "PRO"} />
            <hr className="border-border" />
            <PlanPricesForm
              initial={{
                PRO: {
                  pricePaise: prices.PRO,
                  razorpayPlanId:
                    settings.planPrices?.PRO?.razorpayPlanId ?? "",
                },
                ELITE: {
                  pricePaise: prices.ELITE,
                  razorpayPlanId:
                    settings.planPrices?.ELITE?.razorpayPlanId ?? "",
                },
              }}
              defaults={{
                PRO: planPricePaise.PRO,
                ELITE: planPricePaise.ELITE,
              }}
              envIds={{
                PRO: env.RAZORPAY_PLAN_PRO ?? "",
                ELITE: env.RAZORPAY_PLAN_ELITE ?? "",
              }}
              billingOn={billing}
            />
          </div>
        </Part>
        <Part
          id="limits"
          bare
          title="What each plan includes"
          description="Limits and features for each plan. Changed boxes are marked until you save."
        >
          <PlansForm
            initial={toTable(effectivePlans(settings.entitlements))}
            defaults={toTable(planConfig)}
            paidOnly={[...PAID_ONLY]}
            billingOn={billing}
          />
        </Part>
      </div>
    </>
  );
}
