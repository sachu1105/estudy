import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PaperCard } from "@/features/omr/components/paper-card";
import { UploadPaperButton } from "@/features/omr/components/upload-paper-button";
import { systemClock } from "@/lib/clock";
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
      )}
    </>
  );
}
