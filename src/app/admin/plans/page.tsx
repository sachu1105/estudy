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
import { billingEnabled, planConfig } from "@/server/entitlements";
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

export default async function AdminPlans() {
  await requireAdmin("plans");
  const settings = await loadSettings(true);
  const prices = effectivePrices(settings.planPrices);
  return (
    <>
      <PageHeader
        title="Plans and limits"
        description="What each plan allows (rule 8: everything checks through these)."
      />
      <div className="flex flex-col gap-6">
        <BillingForm enabled={billingEnabled()} />
        <PaidSquadsForm enabled={settings.paidSquads?.enabled ?? false} />
        <FeaturedPlanForm initial={settings.featuredPlan?.plan ?? "PRO"} />
        <PlanPricesForm
          initial={{
            PRO: {
              pricePaise: prices.PRO,
              razorpayPlanId: settings.planPrices?.PRO?.razorpayPlanId ?? "",
            },
            ELITE: {
              pricePaise: prices.ELITE,
              razorpayPlanId: settings.planPrices?.ELITE?.razorpayPlanId ?? "",
            },
          }}
          defaults={{ PRO: planPricePaise.PRO, ELITE: planPricePaise.ELITE }}
          envIds={{
            PRO: env.RAZORPAY_PLAN_PRO ?? "",
            ELITE: env.RAZORPAY_PLAN_ELITE ?? "",
          }}
          billingOn={billingEnabled()}
        />
        <PlansForm
          initial={toTable(effectivePlans(settings.entitlements))}
          defaults={toTable(planConfig)}
        />
      </div>
    </>
  );
}
