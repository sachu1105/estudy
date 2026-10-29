import { Lock } from "lucide-react";

import { passDate } from "@/lib/squads/pay";
import { squadCover } from "@/lib/squads/cover";
import type { ChannelType } from "@/lib/squads/templates";

import { SquadHeading } from "../channels/channel-header";
import { CHANNEL_ICONS } from "../channels/channel-icon";
import { BlurredChat } from "./blurred-chat";
import { PassCardHeader } from "./pass-card-header";
import { PassCheckout } from "./pass-checkout";
import { PassOffer } from "./pass-offer";
import { PassFacts } from "./pass-perks";

/**
 * A paid channel a member hasn't opened yet. The channel sits blurred behind a card
 * edged in gold: the squad's art, who runs it, what's inside (as numbers only), what a
 * pass gets you and the price, then the checkout in the same card. Under the squad's
 * usual heading, so a phone keeps its way back to the channels.
 */
export function LockedChannel({
  groupId,
  channel,
  squad,
  owner,
  stats,
  endedAt,
  selling,
  lastActive,
}: {
  groupId: string;
  channel: {
    id: string;
    name: string;
    type: ChannelType;
    topic: string | null;
    pricePaise: number;
    accessDays: number | null;
  };
  squad: { id: string; name: string; cover: unknown };
  owner: { name: string; avatarUrl: string | null; verified: boolean };
  stats: { messages: number; holders: number };
  /** "3 h ago", or null for a channel with nothing in it yet. */
  lastActive: string | null;
  endedAt: Date | null;
  selling: boolean;
}) {
  const Icon = CHANNEL_ICONS[channel.type];
  return (
    <>
      <SquadHeading
        groupId={groupId}
        icon={Icon}
        title={channel.name}
        subtitle={
          <span className="inline-flex items-center gap-1 text-small">
            <Lock className="size-3.5" aria-hidden /> Paid channel
          </span>
        }
      />
      {/* The card sits in the middle of the channel's space, on top of the blur. */}
      <div className="relative flex min-h-[560px] flex-col items-center md:min-h-[calc(100dvh-13rem)] md:justify-center">
        <BlurredChat className="absolute inset-0" />
        <section
          aria-labelledby="channel-pass"
          className="relative mt-16 w-full max-w-md overflow-hidden rounded-card border border-border bg-surface md:my-6"
        >
          <PassCardHeader
            cover={squadCover(squad)}
            tile={<Icon className="size-6" aria-hidden />}
            kind={`Paid channel in ${squad.name}`}
            title={`#${channel.name}`}
            titleId="channel-pass"
            about={channel.topic}
            owner={owner}
          />
          <div className="flex flex-col gap-4 p-5">
            <PassCheckout
              groupId={groupId}
              channelId={channel.id}
              name={`#${channel.name}`}
              pricePaise={channel.pricePaise}
              accessDays={channel.accessDays}
              renew={!!endedAt}
              selling={selling}
              paused="This channel isn't taking payments right now. Try again later."
            >
              <PassFacts
                facts={[
                  ["Messages", String(stats.messages)],
                  ["Passes", String(stats.holders)],
                  ["Active", lastActive ?? "New"],
                ]}
              />
              {endedAt ? (
                <p
                  role="status"
                  className="rounded-control bg-surface-muted p-3 text-small"
                >
                  Your pass ended on {passDate(endedAt)}. Renew to read and post
                  here again.
                </p>
              ) : null}
              <PassOffer channel={channel} />
            </PassCheckout>
          </div>
        </section>
      </div>
    </>
  );
}
