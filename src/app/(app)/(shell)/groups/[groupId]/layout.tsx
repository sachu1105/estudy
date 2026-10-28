import { Lock } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/features/pods/components/back-link";
import { ChannelNav } from "@/features/groups/components/channels/channel-nav";
import { CHANNEL_ICONS } from "@/features/groups/components/channels/channel-icon";
import {
  SquadBanner,
  squadFacts,
} from "@/features/groups/components/channels/squad-banner";
import { SquadRail } from "@/features/groups/components/channels/squad-rail";
import { SquadLive } from "@/features/groups/components/chat/squad-live";
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
 * the open channel side by side. Phones get Discord's two screens: the squad page is the
 * rail beside the channel list, and a channel has the screen to itself under a bar with
 * a way back. Anyone else sees what it's about and how to get in (rule 9: nothing inside
 * is shown to non-members).
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
    <div
      data-bleed
      data-squad-screen
      className="flex min-h-dvh flex-1 has-[[data-focus-view]]:min-h-0 md:h-full md:min-h-0"
    >
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
        <SquadBanner
          group={group}
          canInvite={layout.canManage}
          menu={{
            owner: role === "OWNER",
            canManage: layout.canManage,
            categories,
            subjects: subjects.map((s) => s.name),
          }}
        />
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
      <div className="flex min-w-0 flex-1 flex-col md:block md:scrollbar-thin md:overflow-y-auto md:has-[[data-focus-view]]:flex">
        <div className="mx-auto flex w-full max-w-content flex-1 flex-col px-4 pt-4 pb-24 has-[[data-focus-view]]:pb-0 md:block md:px-8 md:pt-6 md:pb-12 md:has-[[data-focus-view]]:flex md:has-[[data-focus-view]]:flex-col">
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
  const facts = squadFacts(group);

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
