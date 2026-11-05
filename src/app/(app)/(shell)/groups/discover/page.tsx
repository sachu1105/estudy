import { Compass } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { SquadShell } from "@/features/groups/components/channels/squad-shell";
import { DiscoverHero } from "@/features/groups/components/discover/discover-hero";
import { ExamTabs } from "@/features/groups/components/discover/exam-tabs";
import { SearchPill } from "@/features/groups/components/discover/search-pill";
import { SquadGrid } from "@/features/groups/components/squad-grid";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { verifiedIds } from "@/server/services/verified";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Discover squads" };

/**
 * Every listed squad, by exam or name, with a way in from the card. As Discord's
 * Discover: exams as tabs over a banner, then the squads as cover cards, four across.
 */
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
  // Squads you're in are split out: Discover is for finding new ones, and a card that
  // looks joinable but isn't only confuses.
  const roles = new Map(mine.map((m) => [m.group.id, m.role]));
  const others = directory.filter((g) => !roles.has(g.id));
  const yours = directory.filter((g) => roles.has(g.id));
  const [verified, studying] = await Promise.all([
    verifiedIds(directory.map((g) => g.ownerId)),
    groupService.studyingCounts(directory.map((g) => g.id)),
  ]);
  const href = (exam: string | null) => {
    const params = new URLSearchParams();
    if (exam) params.set("exam", exam);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/groups/discover${s ? `?${s}` : ""}`;
  };
  const tabs = [
    { key: "all", name: "Every exam", href: href(null) },
    ...exams.map((e) => ({ key: e.id, name: short(e.name), href: href(e.id) })),
  ];
  const examName = exams.find((e) => e.id === examId)?.name;
  const heading = q
    ? `Squads matching “${q}”`
    : examName
      ? `${short(examName)} squads`
      : "Popular squads";

  return (
    <SquadShell>
      <div className="min-w-0 flex-1 md:scrollbar-thin md:overflow-y-auto">
        <div className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b border-border bg-bg px-6 md:flex">
          <ExamTabs
            tabs={tabs}
            current={examId ?? "all"}
            className="h-full flex-1"
          />
          <SearchPill examId={examId} q={q} className="w-60 shrink-0" />
        </div>
        <DiscoverHero
          title="Find your squad"
          detail="Whatever exam you're preparing for, there's a squad studying for it. Join one, or ask to."
        >
          <SearchPill examId={examId} q={q} className="max-w-md md:hidden" />
        </DiscoverHero>
        <ExamTabs
          tabs={tabs}
          current={examId ?? "all"}
          className="mt-2 md:hidden"
        />
        <div className="mx-auto flex w-full max-w-content flex-col gap-10 pt-6 md:px-8 md:pt-8 md:pb-12">
          <section aria-labelledby="found" className="flex flex-col gap-4">
            <h2 id="found" className="text-h2">
              {heading}
            </h2>
            {others.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={
                  yours.length
                    ? "You're in every squad that matches"
                    : "No squads match"
                }
                description="Try another name or exam, or create a squad for it."
              />
            ) : (
              <SquadGrid
                squads={others}
                verified={verified}
                studying={studying}
              />
            )}
          </section>
          {yours.length ? (
            <section aria-labelledby="yours" className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 id="yours" className="text-h2">
                  Squads you&apos;re in
                </h2>
                <p className="text-small text-ink-muted">
                  Listed for others to find. They&apos;re in your rail too.
                </p>
              </div>
              <SquadGrid
                squads={yours}
                verified={verified}
                studying={studying}
                roles={roles}
              />
            </section>
          ) : null}
        </div>
      </div>
    </SquadShell>
  );
}

/** "LDC preliminary exam" reads as "LDC" in a list of exams. */
const short = (name: string) => name.replace(/ preliminary exam$/i, "");
