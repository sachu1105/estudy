import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SyllabusCard } from "@/features/syllabus/components/syllabus-card";
import { syllabusState } from "@/features/syllabus/state";
import { requireUser } from "@/server/auth/session";
import { reviewService, uploadUsage } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Syllabus" };

export default async function SyllabusPage() {
  const user = await requireUser();
  const [syllabuses, usage] = await Promise.all([
    reviewService.list(user),
    uploadUsage(user),
  ]);
  const atLimit = usage.used >= usage.limit;

  return (
    <>
      <PageHeader
        title="Syllabus"
        description="Upload your syllabus, or start from one in the catalogue."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/syllabus/catalogue">Browse catalogue</Link>
            </Button>
            {atLimit ? null : (
              <Button asChild variant="primary">
                <Link href="/syllabus/new">Upload syllabus</Link>
              </Button>
            )}
          </div>
        }
      />
      {syllabuses.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No syllabus yet"
          description="Upload the PDF from the notification or paste its text. We'll turn it into subjects and topics for you to check."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {syllabuses.map((s) => (
            <li key={s.id}>
              <SyllabusCard
                id={s.id}
                title={s.title}
                examName={s.exam?.name ?? null}
                subjects={s._count.subjects}
                state={syllabusState(s)}
              />
            </li>
          ))}
        </ul>
      )}
      {Number.isFinite(usage.limit) ? (
        <p className="mt-6 text-small text-ink-muted">
          {usage.used} of {usage.limit} uploads used.
          {atLimit ? " Delete a syllabus to upload another." : ""}
        </p>
      ) : null}
    </>
  );
}
