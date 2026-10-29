import { Check } from "lucide-react";

import { rupees } from "@/lib/pricing/pricing";
import { periodLabel } from "@/lib/squads/pay";

/** What a channel pass gets you, and its price: the offer step of the checkout. */
export function PassOffer({
  channel,
}: {
  channel: { name: string; pricePaise: number; accessDays: number | null };
}) {
  const perks = [
    `Every message, file, poll and mock test in #${channel.name}`,
    "Ask doubts and talk with everyone else in the class",
    channel.accessDays === null
      ? "Yours for good: pay once, no renewals"
      : "Renew any time: unused days carry over",
  ];
  return (
    <>
      <ul className="flex flex-col gap-2">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2.5 text-body">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Check className="size-3.5" aria-hidden />
            </span>
            {perk}
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-baseline gap-x-2 border-t border-border pt-4">
        <span className="font-heading text-display font-semibold tabular-nums">
          {rupees(channel.pricePaise)}
        </span>
        <span className="text-body text-ink-muted">
          {channel.accessDays === null
            ? "once, open for good"
            : `for ${periodLabel(channel.accessDays).toLowerCase()}`}
        </span>
      </p>
    </>
  );
}
