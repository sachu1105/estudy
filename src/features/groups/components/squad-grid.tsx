import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { joinModeOf } from "@/lib/squads/access";
import type { GroupRole } from "@/lib/squads/roles";

import { GroupCard } from "./group-card";
import { QuickJoin } from "./quick-join";

type Squad = ComponentProps<typeof GroupCard>["group"] & { ownerId: string };

/**
 * Squad cards four across on wide screens, one on phones. A squad you're in opens; any
 * other offers its way in (none for invite only: the card itself shows what it is).
 */
export function SquadGrid({
  squads,
  verified,
  studying,
  roles,
}: {
  squads: Squad[];
  verified: Set<string>;
  studying: Map<string, number>;
  roles?: Map<string, GroupRole>;
}) {
  // Columns follow the space beside the rail, not the window.
  return (
    <div className="@container">
      <ul className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
        {squads.map((g) => {
          const role = roles?.get(g.id);
          const mode = joinModeOf(g);
          return (
            <li key={g.id} className="flex">
              <GroupCard
                group={g}
                role={role}
                verified={verified.has(g.ownerId)}
                studying={studying.get(g.id) ?? 0}
                action={
                  role ? (
                    <Button asChild variant="secondary">
                      <Link href={`/groups/${g.id}`}>Open</Link>
                    </Button>
                  ) : mode === "INVITE_ONLY" ? null : (
                    <QuickJoin
                      groupId={g.id}
                      name={g.name}
                      asks={mode === "REQUEST"}
                      paid={g.pricePaise != null}
                    />
                  )
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
