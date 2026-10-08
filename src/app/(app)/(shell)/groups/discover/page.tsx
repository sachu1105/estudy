import { Compass, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { GroupCard } from "@/features/groups/components/group-card";
import { QuickJoin } from "@/features/groups/components/quick-join";
import { BackLink } from "@/features/pods/components/back-link";
import { isId } from "@/lib/ids";
import { joinModeOf } from "@/lib/squads/access";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Discover squads" };

/** Every listed squad, by exam or name, with a way in from the card. */
export default async function DiscoverPage({
  searchParams,
}: PageProps<"/groups/discover">) {
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
  const examLinks = [
    { id: null, name: "Every exam" },
    ...exams.map((e) => ({ id: e.id, name: e.name })),
  ];
  const href = (exam: string | null) => {
    const params = new URLSearchParams();
    if (exam) params.set("exam", exam);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/groups/discover${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <BackLink href="/groups" label="Squads" />
      <PageHeader
        title="Discover squads"
        description="Squads that are open to find. Join one, or ask to."
      />
      <div className="flex flex-col gap-4">
        <form className="flex gap-2" role="search">
          {examId ? <input type="hidden" name="exam" value={examId} /> : null}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Squad name"
            aria-label="Search squads"
            className="max-w-md"
          />
          <Button type="submit" variant="secondary">
            <Search aria-hidden /> Search
          </Button>
        </form>
        <nav aria-label="Exam" className="flex flex-wrap gap-2">
          {examLinks.map((e) => (
            <Link
              key={e.id ?? "all"}
              href={href(e.id)}
              aria-current={e.id === examId ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-chip border px-3 text-small font-medium md:h-8",
                e.id === examId
                  ? "border-transparent bg-accent-soft text-accent-ink"
                  : "border-border bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {e.name.replace(/ preliminary exam$/i, "")}
            </Link>
          ))}
        </nav>
        {directory.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No squads match"
            description="Try another name or exam, or create a squad for it."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {directory.map((g) => {
              const mode = joinModeOf(g);
              return (
                <li key={g.id} className="flex">
                  <GroupCard
                    group={g}
                    action={
                      joined.has(g.id) ? (
                        <span className="text-small text-ink-muted">
                          Joined
                        </span>
                      ) : mode === "INVITE_ONLY" ? null : (
                        <QuickJoin
                          groupId={g.id}
                          name={g.name}
                          asks={mode === "REQUEST"}
                        />
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
