"use client";

import { AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { JobEvent } from "@/server/realtime/types";

import { retryParseAction } from "../actions";
import { useJobStatus } from "../use-job-status";

const STEPS = [
  { stage: "QUEUED", label: "Queued", hint: "Waiting for the reader." },
  {
    stage: "READING",
    label: "Reading",
    hint: "Pulling the text out of your file.",
  },
  {
    stage: "STRUCTURING",
    label: "Structuring",
    hint: "Finding subjects and topics.",
  },
  {
    stage: "READY",
    label: "Ready",
    hint: "Your topic list is ready to review.",
  },
] as const;

export function ParseStatus({
  versionId,
  job,
}: {
  versionId: string;
  job: JobEvent;
}) {
  const router = useRouter();
  const event = useJobStatus(job);
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  // Ready: reload the page, which now renders the review screen.
  useEffect(() => {
    if (event.status === "READY") router.refresh();
  }, [event.status, router]);

  if (event.status === "FAILED") {
    return (
      <Card className="flex flex-col gap-4 p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-danger-ink"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">We couldn&apos;t read this syllabus</h2>
            <p className="text-body text-ink-muted">{event.error}</p>
          </div>
        </div>
        {retryError ? (
          <p className="text-small text-danger-ink">{retryError}</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            disabled={retrying}
            onClick={() =>
              startRetry(async () => {
                const result = await retryParseAction({ versionId });
                if (!result.ok) setRetryError(result.error);
                else router.refresh();
              })
            }
          >
            {retrying ? "Starting again" : "Try again"}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/syllabus/new">Upload or paste instead</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const current = STEPS.findIndex((s) => s.stage === event.stage);
  return (
    <Card className="flex flex-col gap-5 p-5">
      <ol className="flex flex-col gap-4" aria-label="Progress">
        {STEPS.map((step, i) => {
          const done = i < current || event.status === "READY";
          const active = i === current && event.status !== "READY";
          return (
            <li
              key={step.stage}
              className="flex items-start gap-3"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-small",
                  done && "border-success bg-success-soft text-success-ink",
                  active && "border-accent bg-accent-soft text-accent-ink",
                  !done && !active && "border-border text-ink-muted",
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-label="Done" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex flex-col">
                <span
                  className={cn(
                    "text-body font-medium",
                    !done && !active && "text-ink-muted",
                  )}
                >
                  {step.label}
                </span>
                {active ? (
                  <span className="text-small text-ink-muted">{step.hint}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {event.stage === "STRUCTURING" ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-label="Structuring"
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
      <p className="text-small text-ink-muted">
        This can take a few minutes for a long syllabus. You can leave this
        page; it keeps going and will be here when you come back.
      </p>
    </Card>
  );
}
