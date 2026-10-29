import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { initialsOf } from "@/lib/pods/covers";
import { passDate, periodLabel } from "@/lib/squads/pay";
import { squadCover } from "@/lib/squads/cover";

import { PassCardHeader } from "./pass-card-header";
import { PassCheckout } from "./pass-checkout";
import { offerPoints, PassFacts, PassPrice, Perks } from "./pass-perks";

/**
 * A paid squad, for someone outside it: the squad's own card, edged in gold. Who runs
 * it, what's inside, what the pass gets you and the price; then the checkout steps on
 * inside the same card. A member whose pass ran out sees when, and renews.
 */
export function SquadPassCard({
  group,
  owner,
  channels,
  selling,
  lapsedAt,
  inviteOnly,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    cover?: unknown;
    pricePaise: number;
    accessDays: number | null;
    offer: string | null;
    demoUrl: string | null;
    _count: { members: number };
  };
  owner: { name: string; avatarUrl: string | null; verified: boolean };
  channels: number;
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
        <PlayCircle aria-hidden /> Watch a demo class
      </a>
    </Button>
  ) : null;
  const offer = (
    <>
      <PassFacts
        facts={[
          ["Members", String(group._count.members)],
          ["Channels", String(channels)],
          ["Access", periodLabel(group.accessDays)],
        ]}
      />
      {lapsedAt ? (
        <p
          role="status"
          className="rounded-control bg-surface-muted p-3 text-small"
        >
          Your pass ended on {passDate(lapsedAt)}. Renew to get back in; your
          place in the squad was kept.
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <h2 className="text-small font-medium">What you get</h2>
        <Perks
          items={[
            ...offerPoints(group.offer),
            "Every channel, note and mock test shared in the squad",
            group.accessDays === null
              ? "Yours for good: pay once, no renewals"
              : "Renew any time: unused days carry over",
          ]}
        />
      </div>
      <PassPrice pricePaise={group.pricePaise} accessDays={group.accessDays} />
    </>
  );

  return (
    <section
      // Named on its own: the content below the header changes as the checkout steps on.
      aria-label="Squad pass"
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <PassCardHeader
        cover={squadCover(group)}
        tile={initialsOf(group.name)}
        kind="Paid squad"
        title={group.name}
        titleId="squad-name"
        heading="h1"
        verified={owner.verified}
        about={group.description}
        owner={owner}
      />
      <div className="flex flex-col gap-4 p-5">
        {inviteOnly && !lapsedAt ? (
          <>
            {offer}
            <p className="text-body text-ink-muted">
              This squad takes members by invite only. Ask a member for an
              invite link.
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
            {offer}
          </PassCheckout>
        )}
      </div>
    </section>
  );
}
