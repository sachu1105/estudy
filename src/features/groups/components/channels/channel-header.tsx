import { ChevronLeft, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CHANNEL_ICONS, type ChannelSummary } from "./channel-icon";

/** The heading of a page inside a squad. Phones get a way back to the channel list. */
export function SquadHeading({
  groupId,
  icon: Icon,
  title,
  subtitle,
  actions,
  menu,
}: {
  groupId: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** A small menu beside the title (an admin's channel settings). */
  menu?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3">
      <Link
        href={`/groups/${groupId}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 text-small font-medium text-ink-muted hover:text-ink md:hidden"
      >
        <ChevronLeft className="size-4" aria-hidden /> Channels
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="flex min-w-0 items-center gap-2">
              {Icon ? (
                <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden />
              ) : null}
              <span className="break-words">{title}</span>
            </h1>
            {menu}
          </div>
          {subtitle ? (
            <p className="flex flex-wrap items-center gap-x-2 text-body text-ink-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** A channel's name, what it's for, who posts, and its main actions. */
export function ChannelHeader({
  groupId,
  channel,
  actions,
  manage,
}: {
  groupId: string;
  channel: Pick<ChannelSummary, "type" | "name" | "topic" | "postRule">;
  actions?: ReactNode;
  /** The admin's channel menu, when the viewer manages the squad. */
  manage?: ReactNode;
}) {
  const adminsOnly = channel.postRule === "ADMINS";
  return (
    <SquadHeading
      groupId={groupId}
      icon={CHANNEL_ICONS[channel.type]}
      title={channel.name}
      subtitle={
        channel.topic || adminsOnly ? (
          <>
            {channel.topic}
            {adminsOnly ? (
              <span className="inline-flex items-center gap-1 text-small">
                <Lock className="size-3.5" aria-hidden /> Admins post here
              </span>
            ) : null}
          </>
        ) : null
      }
      actions={actions}
      menu={manage}
    />
  );
}
