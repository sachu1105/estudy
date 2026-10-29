import type { ReactNode } from "react";

import { UpgradeCard } from "@/features/billing/components/upgrade-card";
import { cn } from "@/lib/utils/cn";
import type { SessionUser } from "@/server/auth/session";
import { billingEnabled, limit } from "@/server/entitlements";
import { chatService, groupService, squadPay } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

import { SquadRail } from "./squad-rail";

/**
 * Everything under Squads, as in Discord: the rail of your squads (with making and
 * finding one) on the left, and the squad, Discover or a welcome beside it. Rendered by
 * each screen rather than a shared layout, so the rail's unread marks are fresh on every
 * move between squads.
 */
export async function SquadShell({
  user,
  screen = false,
  canCreate = true,
  children,
}: {
  user: SessionUser;
  /** Off where the page has its own way to make a squad. */
  canCreate?: boolean;
  /** A squad's own screens: edge to edge on phones, with the squad's bars for the app's. */
  screen?: boolean;
  children: ReactNode;
}) {
  const [mine, unread, exams, canPrice] = await Promise.all([
    groupService.mine(user),
    chatService.squadsWithUnread(user),
    catalogueService.listExams(),
    canCreate ? squadPay.canPrice(user) : false,
  ]);
  const owned = mine.filter((m) => m.role === "OWNER").length;
  const maxOwned = limit(user, "groupsCreated");

  return (
    <div
      data-bleed
      data-squad-screen={screen ? "" : undefined}
      className={cn(
        "flex flex-1 md:h-full md:min-h-0",
        screen && "min-h-dvh has-[[data-focus-view]]:min-h-0",
      )}
    >
      <SquadRail
        squads={mine.map((m) => ({
          ...m.group,
          unread: unread.has(m.group.id),
        }))}
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
        canCreate={canCreate}
        canPrice={canPrice}
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
