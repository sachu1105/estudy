import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/features/omr/components/back-link";
import { KeyEditor } from "@/features/omr/components/key-editor";
import { MarkingCard } from "@/features/omr/components/marking-card";
import { ReleaseCard } from "@/features/omr/components/release-card";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Answer key and marking" };

/** A time as a datetime-local value ("2026-11-10T18:00") in the person's time zone. */
function localInput(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// A paper's answer key and how it's marked, set before the exam or after it.
export default async function PaperKeyPage({
  params,
}: PageProps<"/omr/[paperId]/key">) {
  const user = await requireUser();
  const { paperId } = await params;
  const found = isId(paperId) ? await omrService.withKey(user, paperId) : null;
  if (!found) notFound();
  const { paper, answerKey } = found;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 md:px-4">
        <BackLink fallback="/tests" label="Back" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-heading text-h3">
            Answer key and marking
          </h1>
          <p className="truncate text-small text-ink-muted">
            {paper.title.replaceAll("_", " ")}
          </p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] md:gap-6 md:pt-6">
        <MarkingCard
          paperId={paper.id}
          shape={paper.shape}
          marking={paper.marking}
          limitMin={paper.limitMin}
          startOpen={false}
        />
        <ReleaseCard
          paperId={paper.id}
          initialAt={
            paper.resultsAt ? localInput(paper.resultsAt, user.timezone) : null
          }
          initialKeyHidden={paper.keyHidden}
        />
        <KeyEditor
          // A new shape is a new key: start from what the server cut it to.
          key={`${paper.shape.questions}-${paper.shape.options}`}
          paperId={paper.id}
          shape={paper.shape}
          initialKey={answerKey}
          initialSource={paper.keySource}
        />
      </main>
    </div>
  );
}
