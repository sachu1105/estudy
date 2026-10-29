"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { periodLabel } from "@/lib/squads/pay";

import { buyChannelAction, buySquadAction } from "../../actions";
import { PayMethods } from "./pay-methods";

/** The checkout's middle step, inside the card: what is paid, how, and the button. */
export function PayReview({
  groupId,
  channelId,
  price,
  accessDays,
  onBack,
  onPaid,
}: {
  groupId: string;
  channelId?: string;
  price: string;
  accessDays: number | null;
  onBack: () => void;
  /** With the pass's end (ISO), or null for good. */
  onPaid: (until: string | null) => void;
}) {
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  // The card changed under the person's eyes: take keyboard and reader focus with it.
  useEffect(() => heading.current?.focus(), []);

  const pay = () =>
    start(async () => {
      const result = channelId
        ? await buyChannelAction({ groupId, channelId })
        : await buySquadAction({ groupId });
      if (!result.ok) return void toast.error(result.error);
      onPaid(result.until);
    });

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to the pass"
          onClick={onBack}
          disabled={pending}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <h3 ref={heading} tabIndex={-1} className="text-h3 outline-none">
          Check and pay
        </h3>
      </div>
      <dl className="flex flex-col gap-2 text-body">
        <Row term="Access" value={periodLabel(accessDays)} />
        <Row term="Starts" value="Now" />
        <Row term="Renews by itself" value="No" />
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
        onClick={pay}
      >
        {pending ? "Paying…" : `Pay ${price}`}
      </Button>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-muted">{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
