import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  CHANNEL_ICONS,
  channelHref,
  type ChannelSummary,
} from "@/features/groups/components/channels/channel-icon";
import { ChannelNav } from "@/features/groups/components/channels/channel-nav";
import { GroupMenu } from "@/features/groups/components/group-menu";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import {
  channelService,
  chatService,
  groupService,
} from "@/server/services/groups";

export const metadata: Metadata = { title: "Squad" };

/**
 * A squad's home. On phones it is the channel list in a panel beside the rail of squads;
 * on md+ (where the list sits beside it) an overview of what's in the squad.
 */
export default async function SquadPage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!isId(groupId)) notFound();
  const [view, layout, unread, subjects] = await Promise.all([
    groupService.view(user, groupId),
    channelService.layout(user, groupId),
    chatService.unread(user, groupId),
    channelService.subjects(user, groupId),
  ]);
  if (!view?.role || !layout) return null; // the layout shows how to join
  const { group } = view;
  const facts = [
    group.exam?.name,
    `${group._count.members} member${group._count.members === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const channels = [
    ...layout.loose,
    ...layout.categories.flatMap((c) => c.channels),
  ];

  const privateBadge =
    group.visibility === "PRIVATE" ? (
      <Badge tone="outline">
        <Lock aria-hidden /> private
      </Badge>
    ) : null;

  return (
    <>
      {/* A phone: the panel beside the rail, as in Discord. It runs edge to edge and
          down under the tab bar, so it undoes the column's padding. */}
      <div className="-mx-4 -mt-4 -mb-24 flex min-h-dvh flex-col rounded-tl-[20px] border-t border-l border-border bg-surface pb-24 md:hidden">
        <header className="flex items-start gap-2 border-b border-border py-3 pr-1 pl-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="truncate text-h2">{group.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
              {facts}
              {privateBadge}
            </p>
          </div>
          <GroupMenu
            groupId={group.id}
            name={group.name}
            owner={view.role === "OWNER"}
            canManage={layout.canManage}
            categories={layout.categories.map(({ id, name }) => ({ id, name }))}
            subjects={subjects.map((s) => s.name)}
          />
        </header>
        {group.description ? (
          <p className="line-clamp-2 px-4 pt-3 text-small text-ink-muted">
            {group.description}
          </p>
        ) : null}
        <div className="px-2 pt-3">
          <ChannelNav
            groupId={group.id}
            loose={layout.loose}
            categories={layout.categories}
            canManage={layout.canManage}
            unread={unread}
            notify={layout.notify}
          />
        </div>
      </div>

      <div className="hidden flex-col gap-6 md:flex">
        <header className="flex min-w-0 flex-col gap-1">
          <h1 className="break-words">{group.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-body text-ink-muted">
            {facts}
            {privateBadge}
          </p>
        </header>
        {group.description ? (
          <p className="max-w-prose text-body">{group.description}</p>
        ) : null}
        <Overview groupId={group.id} channels={channels} />
      </div>
    </>
  );
}

/** md and up, where the channel list sits beside it: each channel as a card. */
function Overview({
  groupId,
  channels,
}: {
  groupId: string;
  channels: ChannelSummary[];
}) {
  return (
    <section aria-labelledby="channels" className="flex flex-col gap-3">
      <h2 id="channels" className="text-h3">
        Channels
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {channels.map((c) => {
          const Icon = CHANNEL_ICONS[c.type];
          return (
            <li key={c.id} className="flex">
              <Link
                href={channelHref(groupId, c.id)}
                className="flex w-full flex-col gap-1 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
              >
                <span className="flex items-center gap-2 text-body font-medium">
                  <Icon className="size-4 text-ink-muted" aria-hidden />
                  {c.name}
                  {c.viewRule !== "EVERYONE" ? (
                    <>
                      <Lock className="size-3.5 text-ink-subtle" aria-hidden />
                      <span className="sr-only">, private</span>
                    </>
                  ) : null}
                </span>
                {c.topic ? (
                  <span className="line-clamp-2 text-small text-ink-muted">
                    {c.topic}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
