import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { BillingForm } from "@/features/admin/components/billing-form";
import {
  PlansForm,
  type PlanTable,
} from "@/features/admin/components/plans-form";
import { billingEnabled, planConfig } from "@/server/entitlements";
import { effectivePlans } from "@/server/entitlements/resolve";
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
  return (
    <>
      <PageHeader
        title="Plans and limits"
        description="What each plan allows (rule 8: everything checks through these)."
      />
      <div className="flex flex-col gap-6">
        <BillingForm enabled={billingEnabled()} />
        <PlansForm
          initial={toTable(effectivePlans(settings.entitlements))}
          defaults={toTable(planConfig)}
        />
      </div>
    </>
  );
}
