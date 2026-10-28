import { Check, FileText, Timer } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format/ago";
import { markedCount, OMR_QUESTIONS, type Marks } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";

import { SheetMenu } from "./sheet-menu";

/** Where a paper stands: not touched, being worked on, or every answer marked. */
function Status({ marked, timer }: { marked: number; timer: TimerView }) {
  if (marked === OMR_QUESTIONS)
    return (
      <Badge tone="success">
        <Check aria-hidden /> All marked
      </Badge>
    );
  if (timer.running)
    return (
      <Badge tone="accent">
        <Timer aria-hidden /> Timer running
      </Badge>
    );
  return marked > 0 ? (
    <Badge tone="outline">In progress</Badge>
  ) : (
    <Badge>Not started</Badge>
  );
}

/**
 * A question paper on the Tests page: its name, where it stands, and how much of the
 * answer sheet is marked. The card opens it; the menu in its corner renames or deletes.
 */
export function PaperCard({
  sheet,
  now,
  timeZone,
}: {
  sheet: {
    id: string;
    title: string;
    updatedAt: Date;
    marks: Marks;
    timer: TimerView;
  };
  now: Date;
  timeZone: string;
}) {
  const marked = markedCount(sheet.marks);
  const percent = Math.round((marked / OMR_QUESTIONS) * 100);

  return (
    <li className="relative flex">
      <Link
        href={`/omr/${sheet.id}`}
        className="flex w-full flex-col gap-4 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span className="flex items-start gap-3 pr-10">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
            <FileText className="size-5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col items-start gap-1.5">
            {/* File names come with underscores; the words read better without. */}
            <span className="line-clamp-2 text-body font-medium break-words">
              {sheet.title.replaceAll("_", " ")}
            </span>
            <Status marked={marked} timer={sheet.timer} />
          </span>
        </span>
        <span className="mt-auto flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-2 text-small text-ink-muted">
            <span>
              <span className="font-mono text-ink tabular-nums">
                {marked}/{OMR_QUESTIONS}
              </span>{" "}
              marked
            </span>
            <span>{timeAgo(sheet.updatedAt, now, timeZone)}</span>
          </span>
          <span
            role="progressbar"
            aria-label="Answers marked"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="block h-1.5 overflow-hidden rounded-full bg-surface-muted"
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${percent}%` }}
            />
          </span>
        </span>
      </Link>
      {/* Beside the link, not in it: a menu can't sit inside a link. */}
      <div className="absolute top-2 right-2">
        <SheetMenu id={sheet.id} title={sheet.title} />
      </div>
    </li>
  );
}
