import { PodTile } from "@/components/blocks/pod-tile";
import { timeAgo } from "@/lib/format/ago";
import { BLANK, markedCount, OMR_QUESTIONS, type Marks } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { SheetMenu } from "./sheet-menu";

/** The paper's own answer sheet as its cover: a bubble per question, filled once marked. */
function SheetArt({ marks }: { marks: Marks }) {
  return (
    // A sheet tucked into the folder, clear of the menu in the corner.
    <span className="block size-full bg-surface-muted pt-4 pr-16 pl-5">
      <span className="grid h-full max-w-72 -rotate-[1.5deg] grid-cols-20 content-start gap-1 rounded-t-chip border border-border bg-surface p-3 shadow-sm">
        {marks.map((mark, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-full",
              mark === BLANK ? "border border-ink-subtle/50" : "bg-accent",
            )}
          />
        ))}
      </span>
    </span>
  );
}

/** Where a paper stands: not touched, being worked on, or every answer marked. */
function status(marked: number, timer: TimerView) {
  if (marked === OMR_QUESTIONS) return "All marked";
  if (timer.running) return "Timer running";
  return marked > 0 ? "In progress" : "Not started";
}

/**
 * A question paper on the Tests page, shaped like a pod: its answer sheet on top, then
 * its name, where it stands and how much is marked. The menu in the corner renames or
 * deletes it.
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

  return (
    <li className="relative flex">
      <PodTile
        href={`/omr/${sheet.id}`}
        // File names come with underscores; the words read better without.
        title={sheet.title.replaceAll("_", " ")}
        subtitle={`${status(marked, sheet.timer)} · ${timeAgo(sheet.updatedAt, now, timeZone)}`}
        art={<SheetArt marks={sheet.marks} />}
        stat={{ value: marked, unit: `of ${OMR_QUESTIONS} marked` }}
        aside={
          marked === OMR_QUESTIONS
            ? "Review"
            : marked > 0 || sheet.timer.running
              ? "Continue"
              : "Start"
        }
        progress={(marked / OMR_QUESTIONS) * 100}
      />
      {/* Beside the link, not in it: a menu can't sit inside a link. */}
      <div className="absolute top-2 right-2 rounded-control bg-surface/90 backdrop-blur-sm">
        <SheetMenu id={sheet.id} title={sheet.title} />
      </div>
    </li>
  );
}
