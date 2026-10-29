import { Check } from "lucide-react";

import { rupees } from "@/lib/pricing/pricing";
import { periodLabel } from "@/lib/squads/pay";

export { offerPoints } from "@/lib/squads/pay";

/** A list of what a pass gets you, each with a gold check. */
export function Perks({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-body">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-ink">
            <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** "₹399 for 1 month", large: the price above the pay button. */
export function PassPrice({
  pricePaise,
  accessDays,
}: {
  pricePaise: number;
  accessDays: number | null;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 border-t border-border pt-4">
      <span className="font-heading text-display font-semibold tabular-nums">
        {rupees(pricePaise)}
      </span>
      <span className="text-body text-ink-muted">
        {accessDays === null
          ? "once, yours for good"
          : `for ${periodLabel(accessDays).toLowerCase()}`}
      </span>
    </p>
  );
}

/** Numbers about what's behind the pass: the term first for readers, the number on top. */
export function PassFacts({
  facts,
}: {
  facts: [label: string, value: string][];
}) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-border rounded-control border border-border text-center">
      {facts.map(([label, value]) => (
        <div
          key={label}
          className="flex min-w-0 flex-col-reverse justify-end gap-0.5 px-1 py-3"
        >
          <dt className="text-small text-ink-muted">
            {label}
          </dt>
          <dd className="font-mono text-body font-medium break-words tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
