import { ChevronLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  CHANNEL_ICONS,
  channelHref,
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
 * A squad's home. On phones it is the channel list; on md+ (where the list sits beside
 * it) an overview of what's in the squad.
 */
export default async function SquadPage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!isId(groupId)) notFound();
  const [view, layout, unread] = await Promise.all([
    groupService.view(user, groupId),
    channelService.layout(user, groupId),
    chatService.unread(user, groupId),
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

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/groups"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 text-small font-medium text-ink-muted hover:text-ink md:hidden"
      >
        <ChevronLeft className="size-4" aria-hidden /> Squads
      </Link>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="break-words">{group.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-body text-ink-muted">
            {facts}
            {group.visibility === "PRIVATE" ? (
              <Badge tone="outline">
                <Lock aria-hidden /> private
              </Badge>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 md:hidden">
          <GroupMenu
            groupId={group.id}
            name={group.name}
            owner={view.role === "OWNER"}
            canManage={layout.canManage}
            categories={layout.categories.map(({ id, name }) => ({ id, name }))}
          />
        </div>
      </header>
      {group.description ? (
        <p className="max-w-prose text-body">{group.description}</p>
      ) : null}

      <div className="md:hidden">
        <ChannelNav
          groupId={group.id}
          loose={layout.loose}
          categories={layout.categories}
          canManage={layout.canManage}
          unread={unread}
        />
      </div>

      <section
        aria-labelledby="channels"
        className="hidden flex-col gap-3 md:flex"
      >
        <h2 id="channels" className="text-h3">
          Channels
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {channels.map((c) => {
            const Icon = CHANNEL_ICONS[c.type];
            return (
              <li key={c.id} className="flex">
                <Link
                  href={channelHref(group.id, c.id)}
                  className="flex w-full flex-col gap-1 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
                >
                  <span className="flex items-center gap-2 text-body font-medium">
                    <Icon className="size-4 text-ink-muted" aria-hidden />
                    {c.name}
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
    </div>
  );
}
