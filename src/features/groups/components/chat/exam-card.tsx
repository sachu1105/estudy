"use client";

import { FileCheck2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PendingMessage } from "@/lib/squads/chat-types";
import { examStatus } from "@/lib/omr/exam";

const at = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** Where the exam stands as this person reads the message. */
function standing(exam: NonNullable<PendingMessage["exam"]>) {
  const status = examStatus(
    {
      opensAt: new Date(exam.opensAt),
      closesAt: exam.closesAt ? new Date(exam.closesAt) : null,
      resultsAt: exam.resultsAt ? new Date(exam.resultsAt) : null,
    },
    new Date(),
  );
  if (status === "upcoming") return `Opens ${at(exam.opensAt)}`;
  if (status === "closed") return "Closed";
  return exam.closesAt ? `Open until ${at(exam.closesAt)}` : "Open now";
}

/** A question paper shared as an exam: what it is, where it stands, and the way in. */
export function ExamCard({
  exam,
}: {
  exam: NonNullable<PendingMessage["exam"]>;
}) {
  return (
    <div className="flex max-w-sm flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
        <FileCheck2 className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">
          {exam.title.replaceAll("_", " ")}
        </span>
        <span className="text-small text-ink-muted">
          Exam · {exam.questions} questions
          {exam.minutes ? ` · ${exam.minutes} min` : ""}
        </span>
        <span className="text-small text-ink-muted" suppressHydrationWarning>
          {standing(exam)}
        </span>
      </span>
      <Button asChild>
        <Link href={`/exams/${exam.id}`}>Open exam</Link>
      </Button>
    </div>
  );
}
