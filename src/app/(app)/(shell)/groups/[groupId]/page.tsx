import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Badge } from "@/components/ui/badge";
import {
  CHANNEL_ICONS,
  channelHref,
  type ChannelSummary,
} from "@/features/groups/components/channels/channel-icon";
import { ChannelNav } from "@/features/groups/components/channels/channel-nav";
import {
  SquadBanner,
  squadFacts,
} from "@/features/groups/components/channels/squad-banner";
import { isId } from "@/lib/ids";
import { priceLabel } from "@/lib/squads/pay";
import { requireUser } from "@/server/auth/session";
import {
  channelService,
  chatService,
  groupService,
} from "@/server/services/groups";
import { verifiedIds } from "@/server/services/verified";

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
  const verified = (await verifiedIds([group.ownerId])).has(group.ownerId);
  const facts = squadFacts(group);
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
      <div className="-mx-4 -mt-4 -mb-24 flex min-h-dvh flex-col overflow-hidden rounded-tl-[20px] border-t border-l border-border bg-surface pb-24 md:hidden">
        <SquadBanner
          group={group}
          verified={verified}
          heading="h1"
          canInvite={layout.canManage}
          menu={{
            owner: view.role === "OWNER",
            canManage: layout.canManage,
            categories: layout.categories.map(({ id, name }) => ({ id, name })),
            subjects: subjects.map((s) => s.name),
          }}
        />
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
          <h1 className="break-words">
            {group.name}
            {verified ? (
              <>
                {" "}
                <VerifiedMark className="size-5" />
              </>
            ) : null}
          </h1>
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
                  {c.viewRule !== "EVERYONE" || c.locked ? (
                    <>
                      <Lock className="size-3.5 text-ink-subtle" aria-hidden />
                      <span className="sr-only">
                        {c.locked ? ", paid, locked" : ", private"}
                      </span>
                    </>
                  ) : null}
                </span>
                {c.topic ? (
                  <span className="line-clamp-2 text-small text-ink-muted">
                    {c.topic}
                  </span>
                ) : null}
                {c.locked && c.pricePaise !== null ? (
                  <span className="text-small text-ink-muted">
                    {priceLabel(c.pricePaise, c.accessDays)}
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
