import { ArrowLeft, Lock, Timer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CHANNEL_ICONS, type ChannelSummary } from "./channel-icon";

/**
 * The heading of a page inside a squad. On a phone it's Discord's bar: back to the
 * channel list, the name with a line under it, the menus, held at the top while the page
 * scrolls; the actions follow below it. From md it's a plain heading with the actions
 * beside it.
 */
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
    // On a phone the header steps aside (contents), so the bar sticks for the length of
    // the page rather than only the header's own height.
    <header className="max-md:contents md:mb-6 md:flex md:flex-wrap md:items-end md:justify-between md:gap-3">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex min-h-14 items-center gap-1 border-b border-border bg-bg/95 py-1 pr-1 pl-1 backdrop-blur md:static md:m-0 md:block md:min-h-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Link
          href={`/groups/${groupId}`}
          aria-label="Back to channels"
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:text-ink md:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col md:gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="flex min-w-0 items-center gap-2 max-md:text-h2">
              {Icon ? (
                <Icon
                  className="size-5 shrink-0 text-ink-muted max-md:size-4"
                  aria-hidden
                />
              ) : null}
              <span className="max-md:truncate md:break-words">{title}</span>
            </h1>
            {/* Beside the title from md; at the bar's far end on a phone. */}
            <span className="hidden md:contents">{menu}</span>
          </div>
          {subtitle ? (
            <p className="flex items-center gap-x-2 text-ink-muted max-md:overflow-hidden max-md:text-small max-md:whitespace-nowrap md:flex-wrap md:text-body">
              {subtitle}
            </p>
          ) : null}
        </div>
        {menu ? <span className="flex shrink-0 md:hidden">{menu}</span> : null}
      </div>
      {actions ? (
        <div className="mb-4 flex flex-wrap gap-2 md:mb-0">{actions}</div>
      ) : null}
    </header>
  );
}

/** A channel's name, what it's for, who posts, and its main actions. */
export function ChannelHeader({
  groupId,
  channel,
  actions,
  manage,
  notify,
  search,
}: {
  groupId: string;
  channel: Pick<
    ChannelSummary,
    "type" | "name" | "topic" | "postRule" | "viewRule" | "slowModeSec"
  >;
  actions?: ReactNode;
  /** The admin's channel menu, when the viewer manages the squad. */
  manage?: ReactNode;
  /** How much of this channel reaches the viewer. */
  notify?: ReactNode;
  /** Finding words in this channel's messages (chat channels). */
  search?: ReactNode;
}) {
  const adminsOnly = channel.postRule === "ADMINS";
  const slow = channel.slowModeSec;
  return (
    <SquadHeading
      groupId={groupId}
      icon={CHANNEL_ICONS[channel.type]}
      title={channel.name}
      subtitle={
        channel.topic ||
        adminsOnly ||
        slow ||
        channel.viewRule !== "EVERYONE" ? (
          <>
            {channel.topic}
            {channel.viewRule !== "EVERYONE" ? (
              <span className="inline-flex items-center gap-1 text-small">
                <Lock className="size-3.5" aria-hidden />
                {channel.viewRule === "ADMINS"
                  ? "Admins and moderators only"
                  : "Private channel"}
              </span>
            ) : null}
            {adminsOnly ? (
              <span className="inline-flex items-center gap-1 text-small">
                <Lock className="size-3.5" aria-hidden /> Admins post here
              </span>
            ) : null}
            {slow ? (
              <span className="inline-flex items-center gap-1 text-small">
                <Timer className="size-3.5" aria-hidden />
                {slow < 60
                  ? `${slow}s between messages`
                  : `${slow / 60} min between messages`}
              </span>
            ) : null}
          </>
        ) : null
      }
      actions={actions}
      menu={
        search || notify || manage ? (
          <span className="flex items-center">
            {search}
            {notify}
            {manage}
          </span>
        ) : null
      }
    />
  );
}
