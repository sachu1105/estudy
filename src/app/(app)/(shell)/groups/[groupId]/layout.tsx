import { Lock } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/features/pods/components/back-link";
import { ChannelNav } from "@/features/groups/components/channels/channel-nav";
import { CHANNEL_ICONS } from "@/features/groups/components/channels/channel-icon";
import { SquadRail } from "@/features/groups/components/channels/squad-rail";
import { SquadLive } from "@/features/groups/components/chat/squad-live";
import { GroupMenu } from "@/features/groups/components/group-menu";
import { JoinButton } from "@/features/groups/components/join-controls";
import { isId } from "@/lib/ids";
import { joinModeOf } from "@/lib/squads/access";
import { requireUser } from "@/server/auth/session";
import {
  channelService,
  chatService,
  groupService,
} from "@/server/services/groups";

/**
 * A squad. Members get its channels: on md+ a rail of their squads, the channel list and
 * the open channel side by side; on phones the squad page lists the channels. Anyone else
 * sees what it's about and how to get in (rule 9: nothing inside is shown to non-members).
 */
export default async function GroupLayout({
  params,
  children,
}: LayoutProps<"/groups/[groupId]">) {
  const user = await requireUser();
  const { groupId } = await params;
  const view = isId(groupId) ? await groupService.view(user, groupId) : null;
  if (!view) notFound();
  const { group, role } = view;

  if (!role) return <Visitor user={user} view={view} />;

  const [layout, mine, unread, unreadSquads, subjects] = await Promise.all([
    channelService.layout(user, groupId),
    groupService.mine(user),
    chatService.unread(user, groupId),
    chatService.squadsWithUnread(user),
    channelService.subjects(user, groupId),
  ]);
  if (!layout) notFound();
  const categories = layout.categories.map(({ id, name }) => ({ id, name }));

  return (
    <div data-bleed className="flex flex-1 flex-col md:h-full md:flex-row">
      <SquadLive groupId={group.id} meId={user.id} />
      <SquadRail
        squads={mine.map((m) => ({
          ...m.group,
          unread: unreadSquads.has(m.group.id),
        }))}
      />
      <aside
        aria-label={`${group.name} channels`}
        className="hidden w-64 shrink-0 flex-col border-r border-border md:flex"
      >
        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border pr-1 pl-4">
          <p className="min-w-0 flex-1 truncate font-heading text-h3 font-medium">
            {group.name}
          </p>
          <GroupMenu
            groupId={group.id}
            name={group.name}
            owner={role === "OWNER"}
            canManage={layout.canManage}
            categories={categories}
            subjects={subjects.map((s) => s.name)}
          />
        </div>
        <div className="flex-1 scrollbar-thin overflow-y-auto p-2">
          <ChannelNav
            groupId={group.id}
            loose={layout.loose}
            categories={layout.categories}
            canManage={layout.canManage}
            unread={unread}
            notify={layout.notify}
          />
        </div>
      </aside>
      <div className="min-w-0 flex-1 has-[[data-focus-view]]:flex has-[[data-focus-view]]:flex-col md:scrollbar-thin md:overflow-y-auto">
        <div className="mx-auto w-full max-w-content has-[[data-focus-view]]:flex has-[[data-focus-view]]:flex-1 has-[[data-focus-view]]:flex-col md:px-8 md:pt-6 md:pb-12 md:has-[[data-focus-view]]:pb-0">
          {view.muted ? (
            <p
              role="status"
              className="mb-4 rounded-card bg-surface-muted p-3 text-small"
            >
              A squad admin has muted you for now: you can read, but not share.
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Someone outside the squad: what it is, its channels if it's public, and how to join. */
async function Visitor({
  user,
  view,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  view: NonNullable<Awaited<ReturnType<typeof groupService.view>>>;
}) {
  const { group } = view;
  const mode = joinModeOf(group);
  const channels = await channelService.preview(user, group.id);
  const facts = [
    group.exam?.name,
    `${group._count.members} member${group._count.members === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <BackLink href="/groups" label="Squads" />
      <PageHeader title={group.name} description={facts} />
      {group.visibility === "PRIVATE" ? (
        <Badge tone="outline" className="-mt-6 mb-6">
          <Lock aria-hidden /> private
        </Badge>
      ) : null}
      <div className="flex max-w-xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          {group.description ? (
            <p className="text-body">{group.description}</p>
          ) : null}
          <p className="text-body text-ink-muted">
            {mode === "INVITE_ONLY"
              ? "This squad takes members by invite only. Ask a member for an invite link."
              : mode === "REQUEST"
                ? "Ask to join and an admin of the squad decides, or use an invite from a member."
                : "Join to see the channels, shared notes and tests, and to take part."}
          </p>
          {mode !== "INVITE_ONLY" && (
            <JoinButton
              groupId={group.id}
              asks={mode === "REQUEST"}
              question={group.joinQuestion}
              requested={view.request === "PENDING"}
            />
          )}
        </section>
        {channels.length ? (
          <section aria-labelledby="inside" className="flex flex-col gap-2">
            <h2 id="inside" className="text-h3">
              Inside
            </h2>
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {channels.map((c) => {
                const Icon = CHANNEL_ICONS[c.type];
                return (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon
                      className="mt-1 size-4 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body font-medium">{c.name}</span>
                      {c.topic ? (
                        <span className="text-small text-ink-muted">
                          {c.topic}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
