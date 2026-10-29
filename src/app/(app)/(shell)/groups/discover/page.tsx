import { Compass, GraduationCap, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  SquadColumn,
  SquadShell,
} from "@/features/groups/components/channels/squad-shell";
import { GroupCard } from "@/features/groups/components/group-card";
import { QuickJoin } from "@/features/groups/components/quick-join";
import { isId } from "@/lib/ids";
import { joinModeOf } from "@/lib/squads/access";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Discover squads" };

/**
 * Every listed squad, by exam or name, with a way in from the card. As Discord's
 * Discover: beside the rail, with the exams as a sidebar on md+ (chips on phones).
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
    <SquadShell user={user}>
      <aside
        aria-label="Discover"
        className="hidden w-72 shrink-0 flex-col border-r border-border md:flex"
      >
        <p className="flex h-14 shrink-0 items-center border-b border-border px-4 font-heading text-h3 font-medium">
          Discover
        </p>
        <nav aria-label="Exam" className="flex flex-col p-2">
          {examLinks.map((e) => (
            <Link
              key={e.id ?? "all"}
              href={href(e.id)}
              aria-current={e.id === examId ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-control px-2 text-h3 transition-colors duration-[120ms]",
                e.id === examId
                  ? "bg-accent-soft font-medium text-accent-ink"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {e.id ? (
                <GraduationCap className="size-5 shrink-0" aria-hidden />
              ) : (
                <Compass className="size-5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{short(e.name)}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <SquadColumn>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:p-8">
            <div className="flex flex-col gap-1">
              <h1>Find your squad</h1>
              <p className="text-body text-ink-muted">
                Squads open to find, for every exam. Join one, or ask to.
              </p>
            </div>
            <form className="flex gap-2" role="search">
              {examId ? (
                <input type="hidden" name="exam" value={examId} />
              ) : null}
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
          </header>
          {/* Phones: the exams as chips, where md+ has the sidebar. */}
          <nav aria-label="Exam" className="flex flex-wrap gap-2 md:hidden">
            {examLinks.map((e) => (
              <Link
                key={e.id ?? "all"}
                href={href(e.id)}
                aria-current={e.id === examId ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-chip border px-3 text-small font-medium",
                  e.id === examId
                    ? "border-transparent bg-accent-soft text-accent-ink"
                    : "border-border bg-surface text-ink-muted hover:text-ink",
                )}
              >
                {short(e.name)}
              </Link>
            ))}
          </nav>
          <section aria-labelledby="found" className="flex flex-col gap-3">
            <h2 id="found" className="text-h3">
              {examId
                ? short(examLinks.find((e) => e.id === examId)?.name ?? "")
                : "Open squads"}
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
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {others.map((g) => {
                  const mode = joinModeOf(g);
                  return (
                    <li key={g.id} className="flex">
                      <GroupCard
                        group={g}
                        action={
                          mode === "INVITE_ONLY" ? null : (
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
          </section>
          {yours.length ? (
            <section aria-labelledby="yours" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="yours" className="text-h3">
                  Squads you&apos;re in
                </h2>
                <p className="text-small text-ink-muted">
                  Listed for others to find. They&apos;re in your rail too.
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {yours.map((g) => (
                  <li key={g.id} className="flex">
                    <GroupCard
                      group={g}
                      role={roles.get(g.id)}
                      action={
                        <Button asChild variant="secondary">
                          <Link href={`/groups/${g.id}`}>Open</Link>
                        </Button>
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

/** "LDC preliminary exam" reads as "LDC" in a list of exams. */
const short = (name: string) => name.replace(/ preliminary exam$/i, "");
