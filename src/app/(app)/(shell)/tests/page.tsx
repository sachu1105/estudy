import { Check, FileText, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BundleTile } from "@/features/omr/components/bundle-tile";
import { PaperShelf } from "@/features/omr/components/paper-shelf";
import { Section } from "@/features/omr/components/tests-section";
import { SquadExamList } from "@/features/omr/components/squad-exam-list";
import { UploadPaperButton } from "@/features/omr/components/upload-paper-button";
import { systemClock } from "@/lib/clock";
import { requireUser } from "@/server/auth/session";
import { bundleService, examService, omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Tests" };

const StoreButton = () => (
  <Button asChild>
    <Link href="/store">
      <Store aria-hidden /> Store
    </Link>
  </Button>
);

type Bundle = Awaited<ReturnType<typeof bundleService.mine>>[number];

/** How the reader came by a bundle they have, and where from. */
function howHad(b: Bundle) {
  const how = b.included
    ? "In your plan"
    : b.pricePaise === null
      ? "Added free"
      : "Bought";
  const where = b.library ? "the Store" : (b.squad?.name ?? null);
  return where ? `${how} · from ${where}` : how;
}

/** Where a bundle the reader made is offered. */
function whereMade(b: Bundle) {
  if (b.hidden) return "No longer offered · buyers keep it";
  if (b.library) return "In the Store";
  return b.squad
    ? `In ${b.squad.name}${b.channel ? ` · #${b.channel.name}` : ""}`
    : "Shared";
}

/**
 * Tests, in three parts so each is clear: squad exams on top, then the papers the
 * person uploaded, the bundles they have (bought, added free or in their plan) and the
 * bundles they made. A bundle opens to its papers; buying lands here, the bundle first.
 */
export default async function TestsPage({ searchParams }: PageProps<"/tests">) {
  const user = await requireUser();
  const [exams, mine, library, query] = await Promise.all([
    examService.list(user),
    bundleService.mine(user),
    bundleService.library(user),
    searchParams,
  ]);
  const mineIds = new Set(mine.map((b) => b.id));
  const made = mine.filter((b) => b.owner);
  // Bundles they have: bought or added, then Store items their plan includes.
  const have = [
    ...mine.filter((b) => !b.owner),
    ...library.filter((b) => b.included && !b.owner && !mineIds.has(b.id)),
  ];
  // Just bought or added (the Store sends them here): said at the top, shown first.
  const added = have.find((b) => b.id === query.added) ?? null;
  if (added) have.sort((a, b) => Number(b === added) - Number(a === added));
  const given = [...new Set(have.flatMap((b) => b.papers.map((p) => p.id)))];
  const listed = await omrService.list(user, given);
  const sheets = listed
    .filter((p) => p.owner)
    .map((p) => ({ ...p, from: null }));
  const attempted = new Set(
    listed.filter((p) => p.attempts > 0).map((p) => p.id),
  );
  const now = systemClock.now();
  const format = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: user.timezone,
  });

  return (
    <>
      <PageHeader
        title="Tests"
        description="Sit question papers on an OMR sheet with a timer: your own uploads, and papers from the Store."
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <StoreButton />
            {sheets.length > 0 ? (
              <UploadPaperButton className="flex-1 sm:flex-none" />
            ) : null}
          </div>
        }
      />
      <div className="flex flex-col gap-8">
        {added ? (
          <p
            role="status"
            className="flex animate-pop-in items-center gap-3 rounded-card bg-success-soft px-4 py-3 text-body"
          >
            <Check className="size-5 shrink-0 text-success" aria-hidden />
            <span>
              <span className="font-medium">{added.title}</span> is in your
              tests, yours for good. Open it below to sit its papers.
            </span>
          </p>
        ) : null}
        {exams.length > 0 ? (
          <SquadExamList
            exams={exams.map((e) => ({
              id: e.id,
              title: e.paper.title,
              squad: e.squad.name,
              channel: e.channel.name,
              status: e.status,
              released: e.released,
              host: e.host,
              done: e.done,
              started: !!e.mine,
              opens: format.format(e.opensAt),
              closes: e.closesAt ? format.format(e.closesAt) : null,
              results: e.resultsAt ? format.format(e.resultsAt) : null,
            }))}
          />
        ) : null}
        {have.length > 0 ? (
          <Section
            id="your-bundles"
            title="Your bundles"
            detail="Bought, added free or in your plan. Open one to sit its papers."
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {have.map((b) => (
                <BundleTile
                  key={b.id}
                  bundle={{
                    id: b.id,
                    title: b.title,
                    papers: b.papers.length,
                    how: howHad(b),
                    attempted: b.papers.filter((p) => attempted.has(p.id))
                      .length,
                    fresh: b === added,
                  }}
                />
              ))}
            </ul>
          </Section>
        ) : null}
        {sheets.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No question papers yet"
            description="Upload a previous paper or a mock as a PDF. It opens next to an OMR answer sheet."
            action={<UploadPaperButton />}
          />
        ) : (
          <PaperShelf sheets={sheets} now={now} timeZone={user.timezone} />
        )}
        {made.length > 0 ? (
          <Section
            id="made-bundles"
            title="Bundles you made"
            detail="What you offer in your squads or the Store."
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {made.map((b) => (
                <BundleTile
                  key={b.id}
                  bundle={{
                    id: b.id,
                    title: b.title,
                    papers: b.papers.length,
                    how: whereMade(b),
                    attempted: null,
                  }}
                />
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}
