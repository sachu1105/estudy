import { Ticket, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SquadHeading } from "@/features/groups/components/channels/channel-header";
import { InvitesPanel } from "@/features/groups/components/invites-panel";
import { JoinRequests } from "@/features/groups/components/join-requests";
import { MemberMenu } from "@/features/groups/components/member-menu";
import { PassLine } from "@/features/groups/components/pay/pass-line";
import { SquadReports } from "@/features/groups/components/squad-reports";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { isId } from "@/lib/ids";
import { cn } from "@/lib/utils/cn";
import {
  canManage,
  canModerate,
  outranks,
  ROLE_LABELS,
} from "@/lib/squads/roles";
import { requireUser } from "@/server/auth/session";
import { verifiedIds } from "@/server/services/verified";
import { groupService, squadPay, squadReports } from "@/server/services/groups";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/members">) {
  const user = await requireUser();
  const { groupId } = await params;
  const data = isId(groupId) ? await groupService.members(user, groupId) : null;
  if (!data) notFound();
  const manages = canManage(data.me.role);
  // The squad's staff handle what members report in it.
  const reports = canModerate(data.me.role)
    ? await squadReports.list(user, groupId)
    : null;
  const now = systemClock.now();
  const [verified, passes] = await Promise.all([
    verifiedIds(data.members.map((m) => m.user.id)),
    // Who paid for what: the squad's staff only (null for everyone else).
    squadPay.passHolders(user, groupId),
  ]);
  const paying = data.members.filter((m) => passes?.has(m.user.id)).length;
  const onlyPaid = !!passes && (await searchParams).paid === "1";
  const shown = onlyPaid
    ? data.members.filter((m) => passes.has(m.user.id))
    : data.members;

  return (
    <div className="flex flex-col gap-8">
      <SquadHeading groupId={groupId} icon={Users} title="Members" />
      {reports?.length ? (
        <SquadReports
          groupId={groupId}
          reports={reports.map((r) => ({
            ...r,
            when: timeAgo(r.first, now, user.timezone),
          }))}
          canSetRole={manages}
          canSetAdmin={data.me.role === "OWNER"}
        />
      ) : null}
      {manages ? (
        <>
          <JoinRequests requests={data.requests} />
          <InvitesPanel
            groupId={groupId}
            invites={data.invites}
            timeZone={user.timezone}
          />
        </>
      ) : null}
      <section aria-labelledby="members" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="members" className="text-h3">
            {data.members.length} member{data.members.length === 1 ? "" : "s"}
          </h2>
          {passes && paying > 0 ? (
            <PaidFilter groupId={groupId} onlyPaid={onlyPaid} paying={paying} />
          ) : null}
        </div>
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {shown.map((m) => {
            const muted = m.muted;
            const isMe = m.user.id === user.id;
            return (
              <li
                key={m.user.id}
                className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-4"
              >
                <Avatar
                  name={m.user.displayName}
                  src={m.user.avatarUrl ?? undefined}
                  size="sm"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-body">
                      {m.user.displayName}
                    </span>
                    {verified.has(m.user.id) ? <VerifiedMark /> : null}
                    {isMe ? (
                      <span className="shrink-0 text-small text-ink-muted">
                        you
                      </span>
                    ) : null}
                  </span>
                  {muted ? (
                    <span className="text-small text-ink-muted">muted</span>
                  ) : null}
                  {/* Who paid for what, and until when: for those who run the squad. */}
                  {passes?.has(m.user.id) ? (
                    <PassLine passes={passes.get(m.user.id)!} />
                  ) : null}
                </span>
                {passes?.has(m.user.id) ? (
                  <Badge tone="accent">
                    <Ticket aria-hidden /> Paid
                  </Badge>
                ) : null}
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

/** All members, or only those holding a pass: how the owner finds who paid. */
function PaidFilter({
  groupId,
  onlyPaid,
  paying,
}: {
  groupId: string;
  onlyPaid: boolean;
  paying: number;
}) {
  const tab = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full px-3 text-small font-medium md:min-h-8",
      active
        ? "bg-accent-soft text-accent-ink"
        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
    );
  return (
    <nav aria-label="Show members" className="flex gap-1">
      <Link
        href={`/groups/${groupId}/members`}
        aria-current={onlyPaid ? undefined : "page"}
        className={tab(!onlyPaid)}
      >
        All
      </Link>
      <Link
        href={`/groups/${groupId}/members?paid=1`}
        aria-current={onlyPaid ? "page" : undefined}
        className={tab(onlyPaid)}
      >
        With a pass · {paying}
      </Link>
    </nav>
  );
}
