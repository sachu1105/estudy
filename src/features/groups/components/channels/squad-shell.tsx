import type { ReactNode } from "react";

import { UpgradeCard } from "@/features/billing/components/upgrade-card";
import { cn } from "@/lib/utils/cn";
import type { SessionUser } from "@/server/auth/session";
import { billingEnabled, limit } from "@/server/entitlements";
import { dmService, friendService } from "@/server/services/friends";
import { chatService, groupService, squadPay } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

import { SquadRail } from "./squad-rail";

/**
 * The rail of your squads, drawn once by the Squads layout so it stays put while you
 * move between squads, Discover and Friends, as in Discord. Its unread marks catch up
 * on each move (the rail asks for them), and joins, leaves and new squads revalidate
 * the layout.
 */
export async function SquadRailMount({ user }: { user: SessionUser }) {
  const [mine, unread, exams, canPrice, dms, requests] = await Promise.all([
    groupService.mine(user),
    chatService.squadsWithUnread(user),
    catalogueService.listExams(),
    squadPay.canPrice(user),
    dmService.unreadTotal(user),
    friendService.incomingCount(user),
  ]);
  const owned = mine.filter((m) => m.role === "OWNER").length;
  const maxOwned = limit(user, "groupsCreated");

  return (
    <SquadRail
      squads={mine.map((m) => ({
        ...m.group,
        unread: unread.has(m.group.id),
      }))}
      exams={exams.map((e) => ({ id: e.id, name: e.name }))}
      canPrice={canPrice}
      friendsCount={dms + requests}
      atLimit={
        owned >= maxOwned ? (
          <UpgradeCard
            title="You have made every squad your plan allows"
            detail={`Your plan covers ${maxOwned} squad${maxOwned === 1 ? "" : "s"} of your own. You can still join others, and nothing you have made goes away.`}
            billingOn={billingEnabled()}
          />
        ) : null
      }
    />
  );
}

/**
 * Everything beside the rail: a squad, Discover, Friends or a welcome. A squad's own
 * screens (`screen`) are edge to edge on phones, with the squad's bars for the app's.
 */
export function SquadShell({
  screen = false,
  className,
  children,
}: {
  screen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-squad-screen={screen ? "" : undefined}
      className={cn("flex min-w-0 flex-1", className)}
    >
      {children}
    </div>
  );
}

/**
 * A page beside the rail that isn't a squad (Discover, a welcome, an invite): it scrolls
 * on its own on md+, and on phones is the app's plain padded page.
 */
export function SquadColumn({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 md:scrollbar-thin md:overflow-y-auto">
      <div className="mx-auto w-full max-w-content md:px-8 md:pt-8 md:pb-12">
        {children}
      </div>
    </div>
  );
}
