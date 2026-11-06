import { Check, FileText, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaperShelf } from "@/features/omr/components/paper-shelf";
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

/**
 * Tests: squad exams on top, then every paper the person can sit in one grid, their
 * uploads and their bundles' papers alike, each saying where it's from and whether
 * it's been attempted. Bundles are bought and browsed in the Store.
 */
export default async function TestsPage({ searchParams }: PageProps<"/tests">) {
  const user = await requireUser();
  const [exams, owned, library, query] = await Promise.all([
    examService.list(user),
    bundleService.mine(user),
    bundleService.library(user),
    searchParams,
  ]);
  // Bundles they have: bought, added or made, then Store items their plan includes.
  const ownedIds = new Set(owned.map((b) => b.id));
  const bundles = [
    ...owned,
    ...library.filter((b) => b.included && !ownedIds.has(b.id)),
  ];
  // Just bought or added (the Store sends them here): said at the top, its papers first.
  const added = bundles.find((b) => b.id === query.added) ?? null;
  if (added) bundles.sort((a, b) => Number(b === added) - Number(a === added));
  // Each paper once, named by the first bundle it came in.
  const from = new Map<string, string>();
  for (const b of bundles)
    for (const p of b.papers) if (!from.has(p.id)) from.set(p.id, b.title);
  const listed = await omrService.list(user, [...from.keys()]);
  const first = new Set(added?.papers.map((p) => p.id) ?? []);
  const sheets = listed
    .map((p) => ({ ...p, from: from.get(p.id) ?? null }))
    .sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id)));
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
              tests, yours for good. Its papers are first below.
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
        {sheets.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No question papers yet"
            description="Upload a previous paper or a mock as a PDF, or get one from the Store. It opens next to an OMR answer sheet."
            action={<UploadPaperButton />}
          />
        ) : (
          <PaperShelf sheets={sheets} now={now} timeZone={user.timezone} />
        )}
      </div>
    </>
  );
}
