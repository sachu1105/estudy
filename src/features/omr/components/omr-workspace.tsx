"use client";

import { Check } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import {
  BLANK,
  blankMarks,
  markedCount,
  toggleMark,
  type Marks,
} from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { ClearSheetButton } from "./clear-sheet-button";
import { DownloadSheetButton } from "./download-sheet-button";
import { LeaveExam } from "./leave-exam";
import { OmrGrid } from "./omr-grid";
import { SheetDivider } from "./sheet-divider";
import { SheetSettings } from "./sheet-settings";
import { useOmrPrefs } from "./use-omr-prefs";
import { useSheetWidth } from "./use-sheet-width";
import { sheetInk } from "./sheet-ink";
import { OmrTimer } from "./omr-timer";
import { PdfPages } from "./pdf-pages";
import { useOmrTimer } from "./use-omr-timer";
import { useSavedMarks } from "./use-saved-marks";

type View = "paper" | "sheet";

/**
 * The paper on the left, the OMR sheet on the right. On a phone they share the screen
 * one at a time, switched from the bar at the bottom. Marks save as you go. The timer
 * comes first: a tap before it runs asks to start it, then counts. Leaving during the
 * exam ends the sitting and resets the timer.
 */
export function OmrWorkspace({
  id,
  title,
  initialMarks,
  initialTimer,
}: {
  id: string;
  title: string;
  initialMarks: Marks;
  initialTimer: TimerView;
}) {
  const { marks, setMarks, saving, dirty, flush } = useSavedMarks(
    id,
    initialMarks,
  );
  const [view, setView] = useState<View>("paper");
  const count = markedCount(marks);
  const timer = useOmrTimer(id, initialTimer, () =>
    toast(`Time's up. You marked ${count} of ${marks.length}.`),
  );
  // Every sitting begins on the exam start, as the hall would (a running clock on
  // opening means the last sitting was left, and the hook has reset it).
  const [timerOpen, setTimerOpen] = useState(true);
  // The bubble tapped before the timer ran; it counts once the timer starts.
  const [waiting, setWaiting] = useState<[number, number] | null>(null);
  const timerOn = useRef(timer.view.on);
  useEffect(() => {
    timerOn.current = timer.view.on;
  }, [timer.view.on]);
  const [prefs, setPrefs] = useOmrPrefs();
  const sheetWidth = useSheetWidth();
  // Read inside the tap, which is memoised for the grid's rows.
  const latest = useRef({ marks, final: prefs.final });
  useEffect(() => {
    latest.current = { marks, final: prefs.final };
  }, [marks, prefs.final]);

  const onMark = useCallback(
    (question: number, option: number) => {
      if (!timerOn.current) {
        setWaiting([question, option]);
        return setTimerOpen(true);
      }
      // Like pen on paper: once marked, an answer stays (unless the setting allows).
      if (latest.current.final && latest.current.marks[question] !== BLANK)
        return void toast(
          `Question ${question + 1} is already marked. Marks are final; change that in sheet settings.`,
          { id: "omr-final" },
        );
      setMarks((m) => toggleMark(m, question, option));
    },
    [setMarks],
  );
  const startTimer = (limitMin: number | null) => {
    timer.run({ op: "start", limitMin });
    timerOn.current = true;
    // A new sitting is a clean sheet: answers from the last one go.
    setMarks(blankMarks());
    if (waiting) setMarks((m) => toggleMark(m, ...waiting));
    setWaiting(null);
    setTimerOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 md:px-4">
        <LeaveExam
          inExam={timer.view.on}
          dirty={dirty}
          flush={flush}
          endSitting={timer.reset}
        />
        <h1 className="min-w-0 flex-1 truncate font-heading text-h3">
          {title}
        </h1>
        <span
          role="status"
          className="sr-only items-center gap-1 text-small text-ink-muted sm:not-sr-only sm:flex"
        >
          {saving ? (
            "Saving"
          ) : (
            <>
              <Check className="size-4" aria-hidden /> Saved
            </>
          )}
        </span>
        <span
          // On phones the count rides on the bottom bar's "Answer sheet" tab instead.
          className="sr-only shrink-0 font-mono text-small tabular-nums sm:not-sr-only"
          aria-label={`${count} of ${marks.length} marked`}
        >
          {count}/{marks.length}
        </span>
        <OmrTimer
          title={title}
          timer={timer}
          open={timerOpen}
          onOpenChange={setTimerOpen}
          onDismiss={() => setWaiting(null)}
          note={
            waiting
              ? "Start the clock to mark your first answer, as in the exam."
              : timer.abandoned
                ? "You left your last sitting, so its clock was reset."
                : null
          }
          final={prefs.final}
          previous={count}
          onStart={startTimer}
        />
        <SheetSettings prefs={prefs} onChange={setPrefs} />
        <DownloadSheetButton
          id={id}
          title={title}
          pen={prefs.pen}
          flush={flush}
        />
        <ClearSheetButton
          disabled={count === 0}
          onClear={() => setMarks(blankMarks())}
        />
      </header>

      {/* Paper | divider | sheet. The sheet's width is the person's, once they drag. */}
      <div
        className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_auto_var(--sheet-w,300px)] lg:grid-cols-[minmax(0,1fr)_auto_var(--sheet-w,500px)]"
        style={
          sheetWidth.width === null
            ? undefined
            : ({ "--sheet-w": `${sheetWidth.width}px` } as CSSProperties)
        }
      >
        <section
          aria-label="Question paper"
          className={cn(
            "min-h-0",
            view === "paper" ? "block" : "hidden md:block",
          )}
        >
          <PdfPages src={`/api/omr/${id}/file`} title={title} />
        </section>
        <SheetDivider
          width={sheetWidth.width}
          onResize={sheetWidth.setLive}
          onCommit={sheetWidth.commit}
        />
        <section
          aria-label="OMR answer sheet"
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain bg-bg p-4",
            view === "sheet" ? "block" : "hidden md:block",
          )}
        >
          <OmrGrid
            marks={marks}
            ink={sheetInk(id)}
            pen={prefs.pen}
            onMark={onMark}
          />
        </section>
      </div>

      <nav
        aria-label="Switch view"
        className="flex shrink-0 justify-center border-t border-border bg-surface px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden"
      >
        <SegmentedControl
          value={view}
          onValueChange={setView}
          ariaLabel="Show"
          className="w-full [&>*]:flex-1"
          options={[
            { value: "paper", label: "Paper" },
            { value: "sheet", label: `Answer sheet · ${count}` },
          ]}
        />
      </nav>
    </div>
  );
}
