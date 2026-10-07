"use client";

import { AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { JobEvent } from "@/server/realtime/types";

import { retryParseAction } from "../actions";
import { useJobStatus } from "../use-job-status";
import { ParseStatusFooter } from "./parse-status-footer";
import type { StartedUpload } from "./upload-form";

const STEPS = [
  { stage: "UPLOADED", label: "Uploaded" },
  { stage: "QUEUED", label: "Waiting for the reader" },
  { stage: "READING", label: "Reading the file" },
  { stage: "STRUCTURING", label: "Finding subjects and topics" },
] as const;

/**
 * The reading of a just-sent syllabus, live and honest (rule 2), inside the upload
 * dialog. Closing it is fine: the job carries on and its tile on Pods follows it.
 */
export function UploadProgress({
  started,
  readerOnline,
  onClose,
}: {
  started: StartedUpload;
  readerOnline: boolean;
  onClose: () => void;
}) {
  const initial: JobEvent = {
    id: started.jobId,
    status: "QUEUED",
    stage: "QUEUED",
    progress: 0,
    error: null,
    reused: false,
  };
  const event = useJobStatus(initial);
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const href = `/syllabus/${started.versionId}`;

  if (event.status === "FAILED")
    return (
      <div role="alert" className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-body text-ink">
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-danger-ink"
            aria-hidden
          />
          {event.error ?? "We couldn't read this syllabus."}
        </p>
        {retryError ? (
          <p className="text-small text-danger-ink">{retryError}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={retrying}
            onClick={() =>
              startRetry(async () => {
                const result = await retryParseAction({
                  versionId: started.versionId,
                });
                if (!result.ok) setRetryError(result.error);
              })
            }
          >
            {retrying ? "Starting again" : "Try again"}
          </Button>
        </div>
      </div>
    );

  const ready = event.status === "READY";
  const current = ready
    ? STEPS.length
    : STEPS.findIndex((s) => s.stage === event.stage);

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Progress" className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step.stage}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  done && "border-success bg-success-soft text-success-ink",
                  active && "border-accent bg-accent-soft text-accent-ink",
                  !done && !active && "border-border text-ink-subtle",
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-label="Done" />
                ) : active ? (
                  <span
                    className="size-2 rounded-full bg-accent motion-safe:animate-pulse"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "flex-1 text-body",
                  done || active ? "text-ink" : "text-ink-muted",
                )}
              >
                {step.label}
              </span>
              {active && step.stage === "STRUCTURING" ? (
                <span className="font-mono text-small text-ink-muted tabular-nums">
                  {Math.round(event.progress)}%
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {ready ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-control bg-success-soft p-3 text-small text-success-ink">
            Read. Check the subjects it found, then it becomes an exam pod.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Later
            </Button>
            <Button asChild variant="primary">
              <Link href={href}>Check subjects</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ParseStatusFooter
            versionId={started.versionId}
            offline={!readerOnline && event.stage === "QUEUED"}
            inDialog
            onDeleted={onClose}
          />
          <Button variant="secondary" onClick={onClose} className="sm:self-end">
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
