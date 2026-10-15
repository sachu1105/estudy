import { ArrowRight, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeCard } from "@/features/billing/components/upgrade-card";
import { CreateGroupDialog } from "@/features/groups/components/create-group-dialog";
import { GroupCard } from "@/features/groups/components/group-card";
import { JoinCodeDialog } from "@/features/groups/components/join-controls";
import { NewSquadTile } from "@/features/groups/components/new-squad-tile";
import { QuickJoin } from "@/features/groups/components/quick-join";
import { joinModeOf } from "@/lib/squads/access";
import { requireUser } from "@/server/auth/session";
import { billingEnabled, limit } from "@/server/entitlements";
import { chatService, groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Squads" };

/** The squads you're in, and a few open ones to discover. */
export default async function GroupsPage() {
  const user = await requireUser();
  const [mine, directory, exams, unread] = await Promise.all([
    groupService.mine(user),
    groupService.directory(null, ""),
    catalogueService.listExams(),
    chatService.squadsWithUnread(user),
  ]);
  const joined = new Set(mine.map((m) => m.group.id));
  const suggested = directory.filter((g) => !joined.has(g.id)).slice(0, 6);
  // Only when they have actually reached it (rule: prompts at a limit, never a wall).
  const owned = mine.filter((m) => m.role === "OWNER").length;
  const maxOwned = limit(user, "groupsCreated");

  return (
    <>
      <PageHeader
        title="Squads"
        description="Study with others: chat, share notes and tests, and see who's keeping up."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <JoinCodeDialog />
            <CreateGroupDialog
              exams={exams.map((e) => ({ id: e.id, name: e.name }))}
            />
          </div>
        }
      />
      <div className="flex flex-col gap-10">
        {owned >= maxOwned ? (
          <UpgradeCard
            title="You have made every squad your plan allows"
            detail={`Your plan covers ${maxOwned} squad${maxOwned === 1 ? "" : "s"} of your own. You can still join others, and nothing you have made goes away.`}
            billingOn={billingEnabled()}
          />
        ) : null}
        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="text-h2">
            Your squads
          </h2>
          {mine.length === 0 ? (
            <p className="text-body text-ink-muted">
              You&apos;re not in a squad yet. Make one and invite a friend, or
              join an open one below.
            </p>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((m) => (
              <li key={m.group.id} className="flex">
                <GroupCard
                  group={m.group}
                  role={m.role}
                  unread={unread.has(m.group.id)}
                />
              </li>
            ))}
            {owned < maxOwned ? (
              <li className="flex">
                <NewSquadTile
                  exams={exams.map((e) => ({ id: e.id, name: e.name }))}
                />
              </li>
            ) : null}
          </ul>
        </section>

        <section aria-labelledby="discover" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="discover" className="text-h2">
              Discover
            </h2>
            <Button asChild variant="ghost">
              <Link href="/groups/discover">
                See all squads <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          {suggested.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No open squads yet"
              description="Create the first one, and others preparing for your exam can find it."
            />
          ) : (
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
          )}
        </section>
      </div>
    </>
  );
}
