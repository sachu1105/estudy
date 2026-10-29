import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/pricing/pricing";
import { passDate, periodLabel } from "@/lib/squads/pay";

import { PassCheckout } from "./pass-checkout";

/**
 * A paid squad, for someone outside it: the price, what the owner says you get, a demo
 * to watch first, and the way in. A member whose pass ran out sees when, and renews.
 */
export function SquadPassCard({
  group,
  selling,
  lapsedAt,
  inviteOnly,
}: {
  group: {
    id: string;
    name: string;
    pricePaise: number;
    accessDays: number | null;
    offer: string | null;
    demoUrl: string | null;
  };
  /** Paid squads are on and the owner may still sell. */
  selling: boolean;
  lapsedAt: Date | null;
  inviteOnly: boolean;
}) {
  const demo = group.demoUrl ? (
    <Button asChild variant="secondary" className="w-full">
      <a
        href={group.demoUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        <PlayCircle aria-hidden /> Watch the demo
      </a>
    </Button>
  ) : null;
  return (
    <section
      // Named on its own: the heading inside goes while the checkout steps on.
      aria-label="Squad pass"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-md dark:shadow-none"
    >
      {inviteOnly && !lapsedAt ? (
        <>
          <Offer group={group} />
          <p className="text-body text-ink-muted">
            This squad takes members by invite only. Ask a member for an invite
            link.
          </p>
          {demo}
        </>
      ) : (
        <PassCheckout
          groupId={group.id}
          name={group.name}
          pricePaise={group.pricePaise}
          accessDays={group.accessDays}
          renew={!!lapsedAt}
          selling={selling}
          paused="This squad isn't taking payments right now. Try again later."
          extra={demo}
        >
          <Offer group={group} />
          {lapsedAt ? (
            <p
              role="status"
              className="rounded-control bg-surface-muted p-3 text-small"
            >
              Your pass ended on {passDate(lapsedAt)}. Renew to get back in;
              your place in the squad was kept.
            </p>
          ) : null}
        </PassCheckout>
      )}
    </section>
  );
}

/** The price and what the owner says you get. */
function Offer({
  group,
}: {
  group: {
    pricePaise: number;
    accessDays: number | null;
    offer: string | null;
  };
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-micro text-ink-muted uppercase">Paid squad</h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-heading text-display font-semibold tabular-nums">
            {rupees(group.pricePaise)}
          </span>
          <span className="text-body text-ink-muted">
            {group.accessDays === null
              ? "once, yours for good"
              : `for ${periodLabel(group.accessDays).toLowerCase()}`}
          </span>
        </p>
      </div>
      {group.offer ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-small font-medium">What you get</h3>
          <p className="text-body whitespace-pre-line">{group.offer}</p>
        </div>
      ) : null}
    </>
  );
}
