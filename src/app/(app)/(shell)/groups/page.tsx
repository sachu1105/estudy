import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { UpgradeCard } from "@/features/billing/components/upgrade-card";
import { CreateGroupDialog } from "@/features/groups/components/create-group-dialog";
import { GroupCard } from "@/features/groups/components/group-card";
import { JoinCodeDialog } from "@/features/groups/components/join-controls";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { billingEnabled, limit } from "@/server/entitlements";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage({
  searchParams,
}: PageProps<"/groups">) {
  const user = await requireUser();
  const query = await searchParams;
  const examId =
    typeof query.exam === "string" && isId(query.exam) ? query.exam : null;
  const q = typeof query.q === "string" ? query.q.slice(0, 80) : "";
  const [mine, directory, exams] = await Promise.all([
    groupService.mine(user),
    groupService.directory(examId, q),
    catalogueService.listExams(),
  ]);
  const joined = new Set(mine.map((m) => m.group.id));
  // Only when they have actually reached it (rule: prompts at a limit, never a wall).
  const owned = mine.filter((m) => m.role === "OWNER").length;
  const maxOwned = limit(user, "groupsCreated");
  const atLimit = owned >= maxOwned;
  const examLinks = [
    { id: null, name: "Every exam" },
    ...exams.map((e) => ({ id: e.id, name: e.name })),
  ];

  return (
    <>
      <PageHeader
        title="Groups"
        description="Study with others: share notes and tests, and see who's keeping up."
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
        {atLimit ? (
          <UpgradeCard
            title="You have made every group your plan allows"
            detail={`Your plan covers ${maxOwned} group${maxOwned === 1 ? "" : "s"} of your own. You can still join others, and nothing you have made goes away.`}
            billingOn={billingEnabled()}
          />
        ) : null}
        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="text-h2">
            Your groups
          </h2>
          {mine.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create one and invite a friend, or join one below."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {mine.map((m) => (
                <li key={m.group.id} className="flex">
                  <GroupCard group={m.group} role={m.role} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="find" className="flex flex-col gap-3">
          <h2 id="find" className="text-h2">
            Find a group
          </h2>
          <nav aria-label="Exam" className="flex flex-wrap gap-2">
            {examLinks.map((e) => (
              <Button
                key={e.id ?? "all"}
                asChild
                variant={e.id === examId ? "secondary" : "ghost"}
              >
                <Link
                  href={e.id ? `/groups?exam=${e.id}` : "/groups"}
                  aria-current={e.id === examId ? "page" : undefined}
                >
                  {e.name}
                </Link>
              </Button>
            ))}
          </nav>
          <form className="flex gap-2" role="search">
            {examId ? <input type="hidden" name="exam" value={examId} /> : null}
            <Input
              name="q"
              defaultValue={q}
              placeholder="Group name"
              aria-label="Search groups"
              className="max-w-md"
            />
            <Button type="submit" variant="secondary">
              <Search aria-hidden /> Search
            </Button>
          </form>
          {directory.filter((g) => !joined.has(g.id)).length === 0 ? (
            <p className="text-body text-ink-muted">
              No open groups here yet. Create the first one.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {directory
                .filter((g) => !joined.has(g.id))
                .map((g) => (
                  <li key={g.id} className="flex">
                    <GroupCard group={g} />
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
