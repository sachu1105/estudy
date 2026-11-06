import { KeyRound, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BackLink } from "@/features/omr/components/back-link";
import { ResultReview } from "@/features/omr/components/result-review";
import { ResultScore } from "@/features/omr/components/result-score";
import { SittingsList } from "@/features/omr/components/sittings-list";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Result" };

// A handed-in sheet, marked against the paper's key as it stands now.
export default async function ResultPage({
  params,
}: PageProps<"/omr/[paperId]/result/[submissionId]">) {
  const user = await requireUser();
  const { paperId, submissionId } = await params;
  const result =
    isId(paperId) && isId(submissionId)
      ? await omrService.result(user, paperId, submissionId)
      : null;
  if (!result) notFound();
  const { paper, submission, score } = result;
  const scored = score.unkeyed < score.outcomes.length;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 md:px-4">
        <BackLink fallback="/tests" label="Back" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-heading text-h3">Result</h1>
          <p className="truncate text-small text-ink-muted">
            {paper.title.replaceAll("_", " ")}
          </p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] md:pt-6">
        <ResultScore
          paperId={paper.id}
          score={score}
          marking={paper.marking}
          timeUsedSec={submission.timeUsedSec}
          limitSec={submission.limitSec}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/omr/${paper.id}`}>
              <RotateCcw aria-hidden /> Sit again
            </Link>
          </Button>
          {scored ? (
            <Button asChild variant="ghost">
              <Link href={`/omr/${paper.id}/key`}>
                <KeyRound aria-hidden /> Answer key and marking
              </Link>
            </Button>
          ) : null}
        </div>
        <ResultReview
          marks={submission.marks}
          answerKey={result.answerKey}
          outcomes={score.outcomes}
          options={paper.shape.options}
        />
        {result.sittings.length > 1 ? (
          <SittingsList
            paperId={paper.id}
            current={submission.id}
            sittings={result.sittings}
            scored={scored}
            timeZone={user.timezone}
          />
        ) : null}
      </main>
    </div>
  );
}
