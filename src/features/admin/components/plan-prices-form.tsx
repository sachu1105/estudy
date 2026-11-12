"use client";

import { ChevronDown } from "lucide-react";
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

  const dirty = PAID_PLAN_NAMES.some(
    (p) =>
      toPaise(draft[p].price) !== initial[p].pricePaise ||
      draft[p].id.trim() !== initial[p].razorpayPlanId,
  );
  const anyId = PAID_PLAN_NAMES.some((p) => draft[p].id.trim() !== "");
  const defaultsText = PAID_PLAN_NAMES.map((p) => rupees(defaults[p])).join(
    " and ",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium text-ink">Prices</p>
        <p className="text-small text-ink-muted">
          What Pro and Elite cost a month on the landing page, the pricing page
          and at checkout. Free is always ₹0. People already subscribed keep
          their old price.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PAID_PLAN_NAMES.map((plan) => {
          const error = problem(plan);
          return (
            <div key={plan} className="flex flex-col gap-1.5">
              <Label htmlFor={`${plan}-price`}>{planLabel(plan)}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
                  ₹
                </span>
                <Input
                  id={`${plan}-price`}
                  inputMode="decimal"
                  className="pr-20 pl-7 tabular-nums"
                  value={draft[plan].price}
                  aria-invalid={error !== null && error.startsWith("Enter")}
                  onChange={(e) => set(plan, "price", e.target.value)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small text-ink-muted">
                  a month
                </span>
              </div>
              {error ? <FieldError>{error}</FieldError> : null}
            </div>
          );
        })}
      </div>

      <details
        open={billingOn || anyId}
        className="group rounded-control border border-border"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-small font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span>
            Razorpay plan ids{" "}
            <span className="font-normal text-ink-muted">
              {billingOn
                ? "· used at checkout"
                : "· only needed once billing is on"}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PAID_PLAN_NAMES.map((plan) => (
              <div key={plan} className="flex flex-col gap-1.5">
                <Label htmlFor={`${plan}-plan-id`}>{planLabel(plan)}</Label>
                <Input
                  id={`${plan}-plan-id`}
                  className="font-mono"
                  placeholder={envIds[plan] || "plan_…"}
                  value={draft[plan].id}
                  onChange={(e) => set(plan, "id", e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-small text-ink-muted">
            Leave one empty to use the id in the server env. Razorpay charges
            what its own plan says, so a new price needs a new Razorpay plan.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending || blocked || !dirty}
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
          Use the default prices ({defaultsText})
        </Button>
      </div>
    </div>
  );
}
