import { Pause, Timer } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SquadHeading } from "@/features/groups/components/channels/channel-header";
import { RoomRefresh } from "@/features/groups/components/room-refresh";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Study room" };

/** Who in the squad is studying right now. Nobody is listed once their timer stops. */
export default async function StudyRoomPage({
  params,
}: PageProps<"/groups/[groupId]/room">) {
  const user = await requireUser();
  const { groupId } = await params;
  const people = isId(groupId)
    ? await groupService.studyRoom(user, groupId)
    : null;
  if (!people) notFound();

  return (
    <>
      <RoomRefresh />
      <SquadHeading
        groupId={groupId}
        icon={Timer}
        title="Study room"
        subtitle="Who's studying right now. Start a session and you'll show up here too."
      />
      {people.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="Nobody is studying yet"
          description="Start a session from Today, and the squad can see you're at it."
        />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={p.name} src={p.avatarUrl ?? undefined} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {p.name}
                  {p.you ? " (you)" : ""}
                </span>
                <span className="flex items-center gap-1 text-small text-ink-muted">
                  {p.paused ? (
                    <>
                      <Pause className="size-3.5" aria-hidden /> Paused
                    </>
                  ) : (
                    "Studying"
                  )}
                </span>
              </span>
              <span className="font-mono text-body tabular-nums">
                {p.minutes} min
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
