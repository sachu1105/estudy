import { Compass, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  SquadColumn,
  SquadShell,
} from "@/features/groups/components/channels/squad-shell";
import { CreateGroupDialog } from "@/features/groups/components/create-group-dialog";
import { GroupCard } from "@/features/groups/components/group-card";
import { JoinCodeDialog } from "@/features/groups/components/join-controls";
import { QuickJoin } from "@/features/groups/components/quick-join";
import { joinModeOf } from "@/lib/squads/access";
import { LAST_SQUAD_COOKIE } from "@/lib/squads/last-squad";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Squads" };

/**
 * Squads opens on the squad you had open last, as Discord reopens the last server (or
 * your first squad). Only someone in no squad yet stays here: a welcome with the ways
 * in, and a few open squads to try.
 */
export default async function GroupsPage() {
  const user = await requireUser();
  const mine = await groupService.mine(user);
  if (mine.length > 0) {
    const last = (await cookies()).get(LAST_SQUAD_COOKIE)?.value;
    const open = mine.find((m) => m.group.id === last) ?? mine[0]!;
    redirect(`/groups/${open.group.id}`);
  }

  const [directory, exams] = await Promise.all([
    groupService.directory(null, ""),
    catalogueService.listExams(),
  ]);
  const suggested = directory.slice(0, 6);

  return (
    <SquadShell user={user} canCreate={false}>
      <SquadColumn>
        <div className="flex flex-col gap-10">
          <section className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-5 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Users className="size-7" aria-hidden />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <h1>Study with a squad</h1>
              <p className="text-body text-ink-muted">
                A squad is you and your friends in one place: chat, share notes
                and tests, and see who&apos;s keeping up. Make one, join with a
                friend&apos;s code, or find an open one.
              </p>
            </div>
            <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              <CreateGroupDialog
                exams={exams.map((e) => ({ id: e.id, name: e.name }))}
                trigger={
                  <Button variant="primary" className="sm:col-span-2">
                    <Plus aria-hidden /> Create squad
                  </Button>
                }
              />
              <JoinCodeDialog />
              <Button asChild variant="secondary">
                <Link href="/groups/discover">
                  <Compass aria-hidden /> Find a squad
                </Link>
              </Button>
            </div>
          </section>

          {suggested.length ? (
            <section aria-labelledby="open" className="flex flex-col gap-3">
              <h2 id="open" className="text-h2">
                Open squads
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {suggested.map((g) => (
                  <li key={g.id} className="flex">
                    <GroupCard
                      group={g}
                      action={
                        joinModeOf(g) === "INVITE_ONLY" ? null : (
                          <QuickJoin
                            groupId={g.id}
                            name={g.name}
                            asks={joinModeOf(g) === "REQUEST"}
                          />
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </SquadColumn>
    </SquadShell>
  );
}
