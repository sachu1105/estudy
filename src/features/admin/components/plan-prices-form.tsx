"use client";

import { IndianRupee } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { planLabel, rupees } from "@/lib/pricing/pricing";
import { PAID_PLAN_NAMES, type SettingValue } from "@/lib/settings/schemas";

import { useSaveSetting } from "./use-save-setting";

type Paid = (typeof PAID_PLAN_NAMES)[number];
export type PlanPrice = { pricePaise: number; razorpayPlanId: string };

/** Rupees as typed ("199", "199.50") to paise; NaN when it isn't a price. */
const toPaise = (raw: string) => {
  const n = Number(raw.trim());
  return raw.trim() === "" || !Number.isFinite(n) ? NaN : Math.round(n * 100);
};

/**
 * What Pro and Elite cost a month. Razorpay charges what its own plan says, so while
 * billing is on a new price needs the id of a Razorpay plan at that price.
 */
export function PlanPricesForm({
  initial,
  defaults,
  envIds,
  billingOn,
}: {
  initial: Record<Paid, PlanPrice>;
  defaults: Record<Paid, number>;
  envIds: Record<Paid, string>;
  billingOn: boolean;
}) {
  const [draft, setDraft] = useState(
    () =>
      Object.fromEntries(
        PAID_PLAN_NAMES.map((p) => [
          p,
          {
            price: String(initial[p].pricePaise / 100),
            id: initial[p].razorpayPlanId,
          },
        ]),
      ) as Record<Paid, { price: string; id: string }>,
  );
  const { save, pending } = useSaveSetting("planPrices");
  const set = (plan: Paid, field: "price" | "id", value: string) =>
    setDraft((d) => ({ ...d, [plan]: { ...d[plan], [field]: value } }));

  const problem = (plan: Paid) => {
    const paise = toPaise(draft[plan].price);
    if (!Number.isFinite(paise) || paise < 100 || paise > 10_000_000)
      return "Enter a price from ₹1 to ₹1,00,000.";
    if (!/^(plan_[A-Za-z0-9]{1,40})?$/.test(draft[plan].id.trim()))
      return "A Razorpay plan id starts with plan_.";
    const id = draft[plan].id.trim();
    // The env plan is the one made at the built-in price.
    const envPlan = id === "" && paise === defaults[plan];
    const idSame = id === initial[plan].razorpayPlanId;
    if (billingOn && paise !== initial[plan].pricePaise && idSame && !envPlan)
      return `Billing is on: create a plan at ${rupees(paise)} a month in Razorpay and paste its id.`;
    return null;
  };
  const blocked = PAID_PLAN_NAMES.some((p) => problem(p) !== null);

  /** Only what differs from the built-in price and env id is saved. */
  const value = (): SettingValue<"planPrices"> =>
    Object.fromEntries(
      PAID_PLAN_NAMES.flatMap((p) => {
        const pricePaise = toPaise(draft[p].price);
        const razorpayPlanId = draft[p].id.trim();
        return pricePaise === defaults[p] && razorpayPlanId === ""
          ? []
          : [[p, { pricePaise, razorpayPlanId }]];
      }),
    );

  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-h3">
          <IndianRupee className="size-4 text-accent" aria-hidden /> Plan prices
        </h2>
        <p className="text-small text-ink-muted">
          What each paid plan costs a month, on the landing page, the pricing
          page and at checkout. Free is always ₹0. People already subscribed
          keep paying their old price.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PAID_PLAN_NAMES.map((plan) => {
          const error = problem(plan);
          return (
            <fieldset key={plan} className="flex flex-col gap-3">
              <legend className="mb-2 text-body font-medium">
                {planLabel(plan)}
              </legend>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${plan}-price`}>Price a month (₹)</Label>
                <Input
                  id={`${plan}-price`}
                  inputMode="decimal"
                  value={draft[plan].price}
                  aria-invalid={error !== null && error.startsWith("Enter")}
                  onChange={(e) => set(plan, "price", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${plan}-plan-id`}>Razorpay plan id</Label>
                <Input
                  id={`${plan}-plan-id`}
                  className="font-mono"
                  placeholder={envIds[plan] || "plan_…"}
                  value={draft[plan].id}
                  onChange={(e) => set(plan, "id", e.target.value)}
                />
              </div>
              {error ? <FieldError>{error}</FieldError> : null}
            </fieldset>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending || blocked}
          onClick={() => save(value(), "Prices saved")}
        >
          Save prices
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            setDraft(
              Object.fromEntries(
                PAID_PLAN_NAMES.map((p) => [
                  p,
                  { price: String(defaults[p] / 100), id: "" },
                ]),
              ) as Record<Paid, { price: string; id: string }>,
            )
          }
        >
          Back to defaults
        </Button>
      </div>
      <p className="text-small text-ink-muted">
        Leave the plan id empty to use the one in the server env. Razorpay
        charges what its plan says, so a new price needs a new Razorpay plan.
      </p>
    </section>
  );
}
