import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Shown only when someone has actually reached a limit: inline, quiet, and never a wall
 * across the screen (milestone 16). While billing is off it explains instead of selling.
 */
export function UpgradeCard({
  title,
  detail,
  billingOn,
  paidOnly = false,
}: {
  title: string;
  detail: string;
  billingOn: boolean;
  /** A feature that stays shut during the free launch, like material mocks. */
  paidOnly?: boolean;
}) {
  return (
    <section
      aria-labelledby="upgrade"
      className="flex max-w-xl flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="upgrade" className="text-h3">
        {title}
      </h2>
      <p className="text-body text-ink-muted">{detail}</p>
      {billingOn || paidOnly ? (
        <Button asChild variant="secondary" className="self-start">
          <Link href="/settings/plan">See the plans</Link>
        </Button>
      ) : (
        <p className="text-small text-ink-muted">
          Everything else is free while we launch, so there is nothing to buy
          yet.
        </p>
      )}
    </section>
  );
}
