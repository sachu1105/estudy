"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/pricing/pricing";

import { PayReceipt } from "./pay-receipt";
import { PayReview } from "./pay-review";

type Step = "offer" | "review" | "done";

/**
 * Paying for a pass inside the card that sells it, never in a second window: the offer
 * (passed in), then a review with how it's paid, then a receipt. Closing the receipt
 * reloads the page, which now shows what the pass opened.
 */
export function PassCheckout({
  groupId,
  channelId,
  name,
  pricePaise,
  accessDays,
  renew = false,
  selling,
  paused,
  extra,
  children,
}: {
  groupId: string;
  /** A pass to this channel; left out, to the squad. */
  channelId?: string;
  /** "#kerala-history" or the squad's name, for the receipt. */
  name: string;
  pricePaise: number;
  accessDays: number | null;
  renew?: boolean;
  selling: boolean;
  /** Said instead of the pay button while sales are paused. */
  paused: string;
  /** Beside the pay button on the offer step (a demo link). */
  extra?: ReactNode;
  /** The offer: what the pass gets you and its price. */
  children: ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("offer");
  const [until, setUntil] = useState<string | null>(null);
  const price = rupees(pricePaise);

  if (step === "review")
    return (
      <PayReview
        groupId={groupId}
        channelId={channelId}
        price={price}
        accessDays={accessDays}
        onBack={() => setStep("offer")}
        onPaid={(end) => {
          setUntil(end);
          setStep("done");
        }}
      />
    );

  if (step === "done")
    return (
      <PayReceipt
        name={name}
        price={price}
        until={until}
        channel={!!channelId}
        onDone={() => router.refresh()}
      />
    );

  return (
    <div className="flex animate-fade-in flex-col gap-4">
      {children}
      {selling ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setStep("review")}
          >
            {renew ? "Renew" : "Get a pass"} · {price}
          </Button>
          {extra}
          <p className="text-center text-small text-ink-muted">
            Demo payment for now: nothing is charged.
          </p>
        </div>
      ) : (
        <>
          <p className="rounded-control bg-surface-muted p-3 text-small text-ink-muted">
            {paused}
          </p>
          {extra}
        </>
      )}
    </div>
  );
}
