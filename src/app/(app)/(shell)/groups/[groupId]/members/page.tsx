import { Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SquadHeading } from "@/features/groups/components/channels/channel-header";
import { InvitesPanel } from "@/features/groups/components/invites-panel";
import { JoinRequests } from "@/features/groups/components/join-requests";
import { MemberMenu } from "@/features/groups/components/member-menu";
import { isId } from "@/lib/ids";
import {
  canManage,
  canModerate,
  outranks,
  ROLE_LABELS,
} from "@/lib/squads/roles";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  params,
}: PageProps<"/groups/[groupId]/members">) {
  const user = await requireUser();
  const { groupId } = await params;
  const data = isId(groupId) ? await groupService.members(user, groupId) : null;
  if (!data) notFound();
  const manages = canManage(data.me.role);

  return (
    <div className="flex flex-col gap-8">
      <SquadHeading groupId={groupId} icon={Users} title="Members" />
      {manages ? (
        <>
          <JoinRequests requests={data.requests} />
          <InvitesPanel groupId={groupId} invites={data.invites} />
        </>
      ) : null}
      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-h3">
          {data.members.length} member{data.members.length === 1 ? "" : "s"}
        </h2>
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {data.members.map((m) => {
            const muted = m.muted;
            const isMe = m.user.id === user.id;
            return (
              <li key={m.user.id} className="flex items-center gap-3 px-3 py-2">
                <Avatar
                  name={m.user.displayName}
                  src={m.user.avatarUrl ?? undefined}
                  size="sm"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">
                    {m.user.displayName}
                    {isMe ? " (you)" : ""}
                  </span>
                  {muted ? (
                    <span className="text-small text-ink-muted">muted</span>
                  ) : null}
                </span>
                {m.role !== "MEMBER" ? (
                  <Badge tone="accent">{ROLE_LABELS[m.role]}</Badge>
                ) : null}
                {!isMe ? (
                  <MemberMenu
                    groupId={groupId}
                    member={{
                      id: m.user.id,
                      name: m.user.displayName,
                      role: m.role,
                      muted,
                    }}
                    canManage={
                      canModerate(data.me.role) &&
                      outranks(data.me.role, m.role)
                    }
                    canSetRole={manages && outranks(data.me.role, m.role)}
                    canSetAdmin={data.me.role === "OWNER"}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
