"use client";

import { AlertCircle, CloudOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useJobStatus } from "@/features/syllabus/use-job-status";
import type { JobEvent } from "@/server/realtime/types";

import { retryCatalogueReadAction } from "../actions";

const STAGES: Record<string, string> = {
  QUEUED: "Waiting for the reader.",
  READING: "Pulling the text out of the file.",
  STRUCTURING: "The AI is finding subjects and topics.",
};

/**
 * A catalogue syllabus the AI is reading (rule 2: honest status). When it's ready the page
 * reloads into the editor; when it fails, the admin tries again or builds it by hand.
 */
export function CatalogueReadStatus({
  versionId,
  examId,
  job,
  readerOnline,
}: {
  versionId: string;
  examId: string | null;
  job: JobEvent;
  readerOnline: boolean;
}) {
  const router = useRouter();
  const event = useJobStatus(job);
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    if (event.status === "READY") router.refresh();
  }, [event.status, router]);

  if (event.status === "FAILED")
    return (
      <Card className="flex flex-col gap-4 p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-danger-ink"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">The AI couldn&apos;t read this syllabus</h2>
            <p className="text-body text-ink-muted">{event.error}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            disabled={retrying}
            onClick={() =>
              startRetry(async () => {
                const result = await retryCatalogueReadAction({ versionId });
                if (!result.ok) toast.error(result.error);
                else router.refresh();
              })
            }
          >
            {retrying ? "Starting again" : "Try again"}
          </Button>
          <Button asChild variant="secondary">
            <Link
              href={`/admin/catalogue/new${examId ? `?exam=${examId}` : ""}`}
            >
              Build it by headings and lists
            </Link>
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="flex flex-col gap-4 p-5" role="status">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3">
          {event.stage === "QUEUED" ? "Queued" : "Reading with AI"}
        </h2>
        <p className="text-body text-ink-muted">
          {STAGES[event.stage] ?? STAGES.QUEUED}
        </p>
      </div>
      {event.stage === "STRUCTURING" ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-label="Reading"
          aria-valuenow={event.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${event.progress}%` }}
          />
        </div>
      ) : null}
      {!readerOnline && event.stage === "QUEUED" ? (
        <p className="flex items-start gap-2 rounded-control bg-surface-muted p-3 text-small text-ink-muted">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          The syllabus reader (the worker) is offline, so reading hasn&apos;t
          started. The file is read as soon as it&apos;s back.
        </p>
      ) : (
        <p className="text-small text-ink-muted">
          A long syllabus can take a few minutes on a local model. You can leave
          this page; the subjects and topics wait here for review.
        </p>
      )}
    </Card>
  );
}
