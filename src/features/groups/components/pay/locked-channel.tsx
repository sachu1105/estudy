import { Lock } from "lucide-react";

import { PodCover } from "@/components/blocks/pod-cover";
import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import { passDate } from "@/lib/squads/pay";
import { squadCover } from "@/lib/squads/cover";
import type { ChannelType } from "@/lib/squads/templates";

import { SquadHeading } from "../channels/channel-header";
import { CHANNEL_ICONS } from "../channels/channel-icon";
import { BlurredChat } from "./blurred-chat";
import { PassCheckout } from "./pass-checkout";
import { PassOffer } from "./pass-offer";

/**
 * A paid channel a member hasn't opened yet. The channel sits blurred behind an
 * elevated card: the squad's art, who runs it, what's inside (as numbers only), what a
 * pass gets you, and the price. Under the squad's usual heading, so a phone keeps its
 * way back to the channels.
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
          className="relative mt-16 w-full max-w-md overflow-hidden rounded-card border border-border bg-surface shadow-lg md:my-6 dark:shadow-none"
        >
          <PodCover cover={squadCover(squad)} className="h-20" />
          <div className="flex flex-col gap-5 p-5 pt-0">
            <div className="flex flex-col gap-3">
              <span className="relative -mt-7 grid size-14 place-items-center rounded-[16px] border-4 border-surface bg-accent-soft text-accent-ink">
                <Icon className="size-6" aria-hidden />
                <span className="absolute -right-2 -bottom-2 grid size-6 place-items-center rounded-full border-2 border-surface bg-ink text-surface">
                  <Lock className="size-3" aria-hidden />
                </span>
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-micro text-ink-muted uppercase">
                  Paid channel in {squad.name}
                </p>
                <h2 id="channel-pass" className="text-h2 break-words">
                  #{channel.name}
                </h2>
                {channel.topic ? (
                  <p className="text-body text-ink-muted">{channel.topic}</p>
                ) : null}
              </div>
              <p className="flex items-center gap-2 text-small text-ink-muted">
                <Avatar name={owner.name} src={owner.avatarUrl} size="sm" />
                <span>
                  Run by{" "}
                  <span className="font-medium text-ink">{owner.name}</span>
                  {owner.verified ? (
                    <>
                      {" "}
                      <VerifiedMark />
                    </>
                  ) : null}
                </span>
              </p>
            </div>

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
              <dl className="grid grid-cols-3 divide-x divide-border rounded-control border border-border text-center">
                <Fact label="Messages" value={String(stats.messages)} />
                <Fact label="Passes" value={String(stats.holders)} />
                <Fact label="Active" value={lastActive ?? "New"} />
              </dl>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    // The term comes first for screen readers; the number shows on top.
    <div className="flex min-w-0 flex-col-reverse gap-0.5 px-2 py-3">
      <dt className="truncate text-micro text-ink-muted uppercase">{label}</dt>
      <dd className="truncate font-mono text-body font-medium tabular-nums">
        {value}
      </dd>
    </div>
  );
}
