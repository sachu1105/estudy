import type { ReactNode } from "react";

import { SquadShell } from "@/features/groups/components/channels/squad-shell";
import type { SessionUser } from "@/server/auth/session";
import { dmService, friendService } from "@/server/services/friends";

import { DmList } from "./dm-list";
import { FriendsLive } from "./friends-live";

/**
 * Friends and direct messages, as Discord's home: the squad rail, then (md+) a column
 * with Friends and every chat, then the page. One live stream keeps it all current.
 */
export async function FriendsShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const [threads, pending] = await Promise.all([
    dmService.threads(user),
    friendService.incomingCount(user),
  ]);
  return (
    <SquadShell screen>
      <FriendsLive meId={user.id} />
      <aside
        aria-label="Friends and messages"
        className="hidden w-72 shrink-0 flex-col border-r border-border md:flex"
      >
        <p className="flex h-14 shrink-0 items-center border-b border-border px-4 font-heading text-h3 font-medium">
          Friends
        </p>
        <div className="flex-1 scrollbar-thin overflow-y-auto p-2">
          <DmList threads={threads} pending={pending} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:min-h-0 md:scrollbar-thin md:overflow-y-auto">
        {children}
      </div>
    </SquadShell>
  );
}
