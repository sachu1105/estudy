import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/features/omr/components/back-link";
import { KeyEditor } from "@/features/omr/components/key-editor";
import { MarkingCard } from "@/features/omr/components/marking-card";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Answer key and marking" };

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
