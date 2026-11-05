import type { ReactNode } from "react";

import { SquadRailMount } from "@/features/groups/components/channels/squad-shell";
import { requireUser } from "@/server/auth/session";

/**
 * Squads, Discover and Friends share one rail, drawn here so it stays still while the
 * page beside it changes. Edge to edge on md+ (data-bleed); a squad's own screen
 * (data-squad-screen) is edge to edge on phones too and fills the height, unless a
 * focus view (a chat) sizes itself.
 */
export default async function GroupsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  return (
    <div
      data-bleed
      className="flex flex-1 max-md:has-[[data-squad-screen]]:not-has-[[data-focus-view]]:min-h-dvh md:h-full md:min-h-0"
    >
      <SquadRailMount user={user} />
      {children}
    </div>
  );
}
