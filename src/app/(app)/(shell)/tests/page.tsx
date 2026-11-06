import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BundleList } from "@/features/omr/components/bundle-list";
import { LibraryShelf } from "@/features/omr/components/library-shelf";
import { PaperCard } from "@/features/omr/components/paper-card";
import { SquadExamList } from "@/features/omr/components/squad-exam-list";
import { UploadPaperButton } from "@/features/omr/components/upload-paper-button";
import { systemClock } from "@/lib/clock";
import { requireUser } from "@/server/auth/session";
import { bundleService, examService, omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Tests" };

export default async function TestsPage() {
  const user = await requireUser();
  const [sheets, exams, bundles, library] = await Promise.all([
    omrService.list(user),
    examService.list(user),
    bundleService.mine(user),
    bundleService.library(user),
  ]);
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
        description="Upload a question paper as a PDF and mark your answers on an OMR sheet beside it."
        actions={sheets.length > 0 ? <UploadPaperButton /> : undefined}
      />
      <div className="flex flex-col gap-8">
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
        {bundles.length > 0 ? (
          <BundleList
            bundles={bundles.map((b) => ({
              id: b.id,
              title: b.title,
              papers: b.papers.length,
              owner: b.owner,
              by: b.library ? "studypods" : b.by,
            }))}
          />
        ) : null}
        {sheets.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No question papers yet"
            description="Upload a previous paper or a mock as a PDF. It opens next to a 100-question answer sheet."
            action={<UploadPaperButton />}
          />
        ) : (
          <section aria-label="Your papers" className="flex flex-col gap-3">
            {exams.length > 0 || bundles.length > 0 ? (
              <h2 className="font-heading text-h2 font-semibold">
                Your papers
              </h2>
            ) : null}
            <ul
              aria-label="Question papers"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {sheets.map((sheet) => (
                <PaperCard
                  key={sheet.id}
                  sheet={sheet}
                  now={now}
                  timeZone={user.timezone}
                />
              ))}
            </ul>
          </section>
        )}
        {library.length > 0 ? (
          <LibraryShelf
            items={library.map((b) => ({
              id: b.id,
              title: b.title,
              papers: b.papers.length,
              pricePaise: b.pricePaise,
              have: b.have,
              included: b.included,
              includedIn: b.includedIn,
            }))}
          />
        ) : null}
      </div>
    </>
  );
}
