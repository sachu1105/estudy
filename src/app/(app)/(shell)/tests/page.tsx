import { ChevronRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetMenu } from "@/features/omr/components/sheet-menu";
import { UploadPaperButton } from "@/features/omr/components/upload-paper-button";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { formatMinutes } from "@/lib/plans/format";
import { markedCount, OMR_QUESTIONS } from "@/lib/omr/marks";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Tests" };

export default async function TestsPage() {
  const user = await requireUser();
  const sheets = await omrService.list(user);
  const now = systemClock.now();

  return (
    <>
      <PageHeader
        title="Tests"
        description="Upload a question paper as a PDF and mark your answers on an OMR sheet beside it."
        actions={sheets.length > 0 ? <UploadPaperButton /> : undefined}
      />
      {sheets.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No question papers yet"
          description="Upload a previous paper or a mock as a PDF. It opens next to a 100-question answer sheet."
          action={<UploadPaperButton />}
        />
      ) : (
        <ul
          aria-label="Question papers"
          className="divide-y divide-border rounded-card border border-border bg-surface"
        >
          {sheets.map((sheet) => (
            <li key={sheet.id} className="flex items-center gap-1 pr-2">
              <Link
                href={`/omr/${sheet.id}`}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-l-card px-4 py-2 hover:bg-surface-muted"
              >
                <FileText
                  className="size-5 shrink-0 text-ink-muted"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">{sheet.title}</span>
                  <span className="text-small text-ink-muted">
                    <span className="font-mono tabular-nums">
                      {markedCount(sheet.marks)}/{OMR_QUESTIONS}
                    </span>{" "}
                    marked
                    {sheet.timer.on
                      ? ` · ${formatMinutes(Math.max(1, Math.round(sheet.timer.elapsedSec / 60)))} used`
                      : ""}{" "}
                    · {timeAgo(sheet.updatedAt, now, user.timezone)}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-ink-muted"
                  aria-hidden
                />
              </Link>
              <SheetMenu id={sheet.id} title={sheet.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
