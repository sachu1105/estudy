import { PodTile } from "@/components/blocks/pod-tile";
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

/** Where a paper stands: not touched, being worked on, every answer marked, or handed in. */
function status(
  marked: number,
  total: number,
  timer: TimerView,
  done: boolean,
) {
  if (marked === total) return "All marked";
  if (timer.running) return "Timer running";
  if (marked > 0) return "In progress";
  return done ? "Submitted" : "Not started";
}

type LastResult = {
  id: string;
  score: Fraction;
  max: Fraction;
  /** Some of the key is in, so the score means something. */
  keyed: boolean;
};

/**
 * A question paper on the Tests page, shaped like a pod: its answer sheet on top, then
 * its name, where it stands, and how much is marked (or, between sittings, the last
 * score). The menu in the corner holds the key, the last result, rename and delete.
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
    last: LastResult | null;
  };
  now: Date;
  timeZone: string;
}) {
  const marked = markedCount(sheet.marks);
  const total = sheet.marks.length;
  const between = marked === 0 && !sheet.timer.running;
  const last = sheet.last;

  return (
    <li className="relative flex">
      <PodTile
        href={`/omr/${sheet.id}`}
        // File names come with underscores; the words read better without.
        title={sheet.title.replaceAll("_", " ")}
        subtitle={`${status(marked, total, sheet.timer, last !== null)} · ${timeAgo(sheet.updatedAt, now, timeZone)}`}
        art={<SheetArt id={sheet.id} marks={sheet.marks} />}
        stat={
          between && last
            ? last.keyed
              ? {
                  value: formatScore(last.score),
                  unit: `of ${formatScore(last.max)}, last score`,
                }
              : { value: "–", unit: "add the key to score it" }
            : { value: marked, unit: `of ${total} marked` }
        }
        aside={
          marked === total
            ? "Review"
            : !between
              ? "Continue"
              : last
                ? "Sit again"
                : "Start"
        }
        progress={(marked / total) * 100}
      />
      {/* Beside the link, not in it: a menu can't sit inside a link. */}
      <div className="absolute top-2 right-2 rounded-control bg-surface/90 backdrop-blur-sm">
        <SheetMenu
          id={sheet.id}
          title={sheet.title}
          lastResultId={last?.id ?? null}
        />
      </div>
    </li>
  );
}
