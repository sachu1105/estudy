import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RankRow } from "@/components/blocks/rank-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RankFilters } from "@/features/rank/components/rank-filters";
import { isId } from "@/lib/ids";
import { DISTRICTS } from "@/lib/progress/districts";
import type { RankPeriod } from "@/lib/progress/rank-keys";
import { requireUser } from "@/server/auth/session";
import { rankService } from "@/server/services/rank";

export const metadata: Metadata = { title: "Rank" };

const PERIODS: [RankPeriod, string][] = [
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All time"],
];

export default async function RankPage({ searchParams }: PageProps<"/rank">) {
  const user = await requireUser();
  const query = await searchParams;
  const period = PERIODS.find(([p]) => p === query.period)?.[0] ?? "week";
  const examId =
    typeof query.exam === "string" && isId(query.exam) ? query.exam : null;
  const district =
    typeof query.district === "string" &&
    (DISTRICTS as readonly string[]).includes(query.district)
      ? query.district
      : null;
  const [board, exams] = await Promise.all([
    rankService.board(user, { period, examId, district }),
    rankService.examsFor(user.id),
  ]);
  const href = (p: RankPeriod) =>
    `/rank?${new URLSearchParams({ period: p, ...(examId ? { exam: examId } : {}), ...(district ? { district } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Rank"
        description="By XP: study minutes, tasks and tests. Display names only."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Period"
          className="flex gap-1 self-start rounded-control bg-surface-muted p-1"
        >
          {PERIODS.map(([p, label]) => (
            <Button
              key={p}
              asChild
              variant={p === period ? "secondary" : "ghost"}
              className="h-9"
            >
              <Link
                href={href(p)}
                aria-current={p === period ? "page" : undefined}
              >
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <RankFilters exams={exams} />
      </div>
      {board.rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No one here yet"
          description="Finish a task or a test to earn XP and take the first place."
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <ol className="divide-y divide-border">
            {board.rows.map((r) => (
              <li key={`${r.rank}-${r.name}`}>
                <RankRow {...r} />
              </li>
            ))}
          </ol>
          {board.me ? (
            <div className="border-t-2 border-border">
              <p className="px-3 pt-2 text-small text-ink-muted">Your place</p>
              <RankRow {...board.me} />
            </div>
          ) : null}
        </div>
      )}
      {!board.ranked && board.rows.length > 0 ? (
        <p className="mt-3 text-small text-ink-muted">
          Earn some XP and you show up here.
        </p>
      ) : null}
      <p className="mt-3 text-small text-ink-muted">
        Rather not appear by name? Turn on &quot;Hide me from the rank&quot; in{" "}
        <Link
          href="/settings"
          className="font-medium text-accent-ink hover:underline"
        >
          settings
        </Link>
        .
      </p>
    </>
  );
}
