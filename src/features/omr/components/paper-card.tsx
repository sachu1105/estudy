import { Check, PenLine } from "lucide-react";

import { PodTile } from "@/components/blocks/pod-tile";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format/ago";
import { formatScore, type Fraction } from "@/lib/omr/fraction";
import { markedCount, type Marks } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { sheetInk } from "./sheet-ink";
import { SheetMenu } from "./sheet-menu";

const COLUMNS = 3;
// What shows above the card body: three rows of three columns.
const ROWS = 3;

/**
 * The paper's own answer sheet as its cover: printed in colour like a real OMR sheet, a
 * header band, then the first questions in columns, A-D each. Only what's really marked
 * is filled, in pen.
 */
function SheetArt({ id, marks }: { id: string; marks: Marks }) {
  const ink = sheetInk(id);
  // Numbered down each column, as on a printed sheet.
  const shown = Array.from({ length: COLUMNS * ROWS }, (_, i) => {
    const row = Math.floor(i / COLUMNS);
    const column = i % COLUMNS;
    return column * ROWS + row;
  });
  return (
    // A sheet tucked into the folder, clear of the menu in the corner.
    <span className="block size-full bg-surface-muted pt-4 pr-16 pl-5">
      {/* Paper, so white in any theme. */}
      <span
        data-theme="light"
        className="flex h-full max-w-72 -rotate-[1.5deg] flex-col gap-2 rounded-t-chip border border-border bg-surface p-2.5 shadow-sm"
      >
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-[3px] px-1.5 py-1",
            ink.band,
          )}
        >
          <span className={cn("h-1 w-10 rounded-full", ink.bar)} />
          <span className={cn("h-1 w-5 rounded-full", ink.bar)} />
          <span className={cn("ml-auto h-1 w-7 rounded-full", ink.bar)} />
        </span>
        <span className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {shown.map((q) => (
            <span key={q} className="flex items-center gap-[3px]">
              <span
                className={cn(
                  "mr-0.5 h-[3px] w-2 shrink-0 rounded-full",
                  ink.bar,
                )}
              />
              {[0, 1, 2, 3].map((option) => (
                <span
                  key={option}
                  className={cn(
                    "h-[7px] w-[9px] shrink-0 rounded-[3px]",
                    marks[q] === option ? "bg-ink/85" : cn("border", ink.line),
                  )}
                />
              ))}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

type LastResult = {
  id: string;
  score: Fraction;
  max: Fraction;
  /** Some of the key is in, so the score means something. */
  keyed: boolean;
};

export type PaperCardSheet = {
  id: string;
  title: string;
  updatedAt: Date;
  marks: Marks;
  timer: TimerView;
  last: LastResult | null;
  /** How many times they've handed it in. */
  attempts: number;
  /** Their own upload, or a paper from a bundle (named here). */
  owner: boolean;
  from: string | null;
};

/** Where a paper stands for its sitter, as the filters on Tests count it. */
export type PaperStanding = "new" | "going" | "done";

export function standingOf(
  sheet: Pick<PaperCardSheet, "marks" | "timer" | "attempts">,
): PaperStanding {
  if (sheet.timer.running || markedCount(sheet.marks) > 0) return "going";
  return sheet.attempts > 0 ? "done" : "new";
}

/** The attempt mark: never sat, being sat now, or handed in so many times. */
function AttemptBadge({ sheet }: { sheet: PaperCardSheet }) {
  const standing = standingOf(sheet);
  if (standing === "going")
    return (
      <Badge tone="accent">
        <PenLine aria-hidden />
        {markedCount(sheet.marks) === sheet.marks.length
          ? "All marked, not submitted"
          : "In progress"}
      </Badge>
    );
  if (sheet.attempts === 0) return <Badge tone="neutral">Not attempted</Badge>;
  return (
    <Badge tone="success">
      <Check aria-hidden /> Attempted
      {sheet.attempts > 1 ? ` ${sheet.attempts} times` : " once"}
    </Badge>
  );
}

/**
 * A question paper on the Tests page, shaped like a pod: its answer sheet on top, then
 * its name, where it's from, whether it's been attempted (and how often), and the
 * marks so far or the last score. Their own papers' menu holds the key, the last
 * result, rename and delete.
 */
export function PaperCard({
  sheet,
  now,
  timeZone,
}: {
  sheet: PaperCardSheet;
  now: Date;
  timeZone: string;
}) {
  const marked = markedCount(sheet.marks);
  const total = sheet.marks.length;
  const standing = standingOf(sheet);
  const last = sheet.last;

  return (
    <li className="relative flex">
      <PodTile
        href={`/omr/${sheet.id}`}
        // File names come with underscores; the words read better without.
        title={sheet.title.replaceAll("_", " ")}
        subtitle={`${sheet.owner ? "Your upload" : `From ${sheet.from ?? "a bundle"}`} · ${timeAgo(sheet.updatedAt, now, timeZone)}`}
        badges={<AttemptBadge sheet={sheet} />}
        art={<SheetArt id={sheet.id} marks={sheet.marks} />}
        stat={
          standing === "going"
            ? { value: marked, unit: `of ${total} marked` }
            : last
              ? last.keyed
                ? {
                    value: formatScore(last.score),
                    unit: `of ${formatScore(last.max)}, last score`,
                  }
                : { value: "–", unit: "add the key to score it" }
              : { value: total, unit: "questions" }
        }
        aside={
          standing === "going"
            ? marked === total
              ? "Review"
              : "Continue"
            : last
              ? "Sit again"
              : "Start"
        }
        progress={standing === "going" ? (marked / total) * 100 : undefined}
      />
      {sheet.owner ? (
        // Beside the link, not in it: a menu can't sit inside a link.
        <div className="absolute top-2 right-2 rounded-control bg-surface/90 backdrop-blur-sm">
          <SheetMenu
            id={sheet.id}
            title={sheet.title}
            lastResultId={last?.id ?? null}
          />
        </div>
      ) : null}
    </li>
  );
}
