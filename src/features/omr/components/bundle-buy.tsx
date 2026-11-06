"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PayMethods } from "@/features/groups/components/pay/pay-methods";
import { rupees } from "@/lib/pricing/pricing";

import { buyBundleAction } from "../bundle-actions";

type Step = "offer" | "review" | "done";

/**
 * Paying for a bundle inside its card, as with squad passes: the price, then a review
 * with how it's paid, then a receipt. Demo payments for now: nothing is charged.
 */
export function BundleBuy({
  id,
  title,
  pricePaise,
}: {
  id: string;
  title: string;
  pricePaise: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("offer");
  const [pending, start] = useTransition();
  const price = rupees(pricePaise);

  if (step === "done")
    return (
      <div
        role="status"
        className="flex animate-pop-in flex-col items-center gap-3 py-2 text-center"
      >
        <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-6" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="text-h3">Payment done</p>
        <p className="text-small text-ink-muted">
          <span className="font-medium text-ink">{title}</span> is yours for
          good, in your tests.
        </p>
        <Button variant="primary" onClick={() => router.refresh()}>
          Open the papers
        </Button>
      </div>
    );

  if (step === "review")
    return (
      <div className="flex animate-fade-in flex-col gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to the bundle"
            disabled={pending}
            onClick={() => setStep("offer")}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <h3 className="text-h3">Check and pay</h3>
        </div>
        <dl className="flex flex-col gap-2 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Access</dt>
            <dd>For good</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-mono text-h3 font-medium tabular-nums">
              {price}
            </dd>
          </div>
        </dl>
        <PayMethods />
        <Button
          variant="primary"
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await buyBundleAction({ id });
              if (!result.ok) return void toast.error(result.error);
              setStep("done");
            })
          }
        >
          {pending ? "Paying…" : `Pay ${price}`}
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="primary"
        className="w-full"
        onClick={() => setStep("review")}
      >
        Buy · {price}
      </Button>
      <p className="text-center text-small text-ink-muted">
        Demo payment for now: nothing is charged.
      </p>
    </div>
  );
}
