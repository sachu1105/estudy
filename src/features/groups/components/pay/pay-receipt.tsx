"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { passDate } from "@/lib/squads/pay";

/** The checkout's last step, inside the card: done, what it opened, and until when. */
export function PayReceipt({
  name,
  price,
  until,
  channel,
  onDone,
}: {
  name: string;
  price: string;
  /** ISO end of the pass; null for good. */
  until: string | null;
  channel: boolean;
  onDone: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div
      role="status"
      className="flex animate-pop-in flex-col items-center gap-4 py-2 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
        <Check className="size-7" strokeWidth={2.5} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h3 ref={heading} tabIndex={-1} className="text-h2 outline-none">
          Payment done
        </h3>
        <p className="text-body text-ink-muted">
          Your pass to <span className="font-medium text-ink">{name}</span> is
          active.
        </p>
      </div>
      <dl className="flex w-full flex-col gap-2 rounded-card border border-border p-3 text-body">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Paid</dt>
          <dd className="font-mono tabular-nums">{price} · demo</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Pass ends</dt>
          <dd>{until ? passDate(new Date(until)) : "Never"}</dd>
        </div>
      </dl>
      <Button
        variant="primary"
        className="w-full"
        disabled={opening}
        onClick={() => {
          setOpening(true);
          onDone();
        }}
      >
        {channel ? "Open the channel" : "Open the squad"}
      </Button>
    </div>
  );
}
