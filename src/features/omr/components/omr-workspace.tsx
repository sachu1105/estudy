"use client";

import { Check, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { Button } from "@/components/ui/button";
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

import { downloadAnswerSheet } from "./download-sheet";
import { LeaveExam } from "./leave-exam";
import { OmrGrid } from "./omr-grid";
import type { ExamSitting, PaperSummary } from "./paper-summary";
import { sheetApi } from "./sheet-api";
import { SheetDivider } from "./sheet-divider";
import { SheetTools } from "./sheet-tools";
import { SubmitSheet, useHandIn } from "./submit-sheet";
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
 * exam ends the sitting and resets the timer. Submitting hands the sheet in to be marked
 * against the key; when the time runs out the sheet asks for it.
 *
 * A squad exam is the one sitting for its rank list: the clock starts once and keeps
 * running (leaving doesn't stop it, reopening carries on), and when it runs out the sheet
 * is handed in as it stands.
 */
export function OmrWorkspace({
  paper,
  exam = null,
  initialMarks,
  initialTimer,
}: {
  paper: PaperSummary;
  exam?: ExamSitting | null;
  initialMarks: Marks;
  initialTimer: TimerView;
}) {
  const { id, title } = paper;
  const examId = exam?.id ?? null;
  const api = useMemo(() => sheetApi(id, examId), [id, examId]);
  const { marks, setMarks, saving, dirty, flush } = useSavedMarks(
    api.saveMarks,
    initialMarks,
  );
  const [view, setView] = useState<View>("paper");
  const count = markedCount(marks);
  const [submit, setSubmit] = useState<"closed" | "open" | "time-up">("closed");
  const [submitted, setSubmitted] = useState(false);
  const autoHandIn = useHandIn(api, flush, () => setSubmitted(true));
  const timer = useOmrTimer(api, initialTimer, () =>
    // An exam's sheet is collected when time's up; practice asks first.
    exam ? void autoHandIn.handIn() : setSubmit("time-up"),
  );
  // Every sitting begins on the exam start, as the hall would (a running clock on
  // opening means the last sitting was left, and the hook has reset it). A squad
  // exam already under way opens straight onto the sheet.
  const [timerOpen, setTimerOpen] = useState(!(exam && initialTimer.on));
  // The bubble tapped before the timer ran; it counts once the timer starts.
  const [waiting, setWaiting] = useState<[number, number] | null>(null);
  const timerOn = useRef(timer.view.on);
  useEffect(() => {
    timerOn.current = timer.view.on;
  }, [timer.view.on]);
  const [prefs, setPrefs] = useOmrPrefs();
  // The owner reaches the key between sittings, never in the middle of one.
  const keyHref =
    paper.owner && !exam && !(timer.view.on && !submitted)
      ? `/omr/${id}/key`
      : null;
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
    setMarks(blankMarks(marks.length));
    if (waiting) setMarks((m) => toggleMark(m, ...waiting));
    setWaiting(null);
    setTimerOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col">
      {/*
        Who and where on the left: the way out, the paper, and how the sheet stands.
        What to do on the right: the sheet's tools, then (past a divider) the exam's
        own pair, the clock and Submit. On a phone the tools menu sits last and Submit
        moves to the bottom bar.
      */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-surface px-2 md:gap-2 md:px-4">
        <LeaveExam
          inExam={timer.view.on && !submitted}
          keepsRunning={exam !== null}
          dirty={dirty}
          flush={flush}
          endSitting={timer.reset}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-heading text-h3">{title}</h1>
          <p className="flex min-w-0 items-center gap-1.5 text-small text-ink-muted">
            <span
              role="status"
              className="inline-flex shrink-0 items-center gap-1"
            >
              {saving ? (
                "Saving"
              ) : (
                <>
                  <Check className="size-3.5" aria-hidden /> Saved
                </>
              )}
            </span>
            <span aria-hidden>·</span>
            <span
              className="truncate tabular-nums"
              aria-label={`${count} of ${marks.length} marked`}
            >
              {count} of {marks.length} marked
            </span>
          </p>
        </div>
        <div className="order-last md:order-none">
          <SheetTools
            keyHref={keyHref}
            inExam={exam !== null}
            marked={count}
            prefs={prefs}
            onPrefs={setPrefs}
            onDownload={async () => {
              await flush();
              await downloadAnswerSheet(id, title, prefs.pen);
            }}
            onClear={() => setMarks(blankMarks(marks.length))}
          />
        </div>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border md:block" />
        <OmrTimer
          paper={paper}
          exam={exam}
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
        <Button
          variant="primary"
          className="hidden md:inline-flex"
          disabled={count === 0 || autoHandIn.pending}
          onClick={() => setSubmit("open")}
        >
          <Send aria-hidden /> Submit
        </Button>
      </header>
      <SubmitSheet
        api={api}
        open={submit !== "closed"}
        onOpenChange={(open) => setSubmit(open ? "open" : "closed")}
        marked={count}
        questions={marks.length}
        keyed={paper.keyed}
        release={paper.release ?? null}
        timeUp={submit === "time-up"}
        flush={flush}
        onSubmitted={() => setSubmitted(true)}
      />

      {/* Paper | divider | sheet. The sheet's width is the person's, once they drag. */}
      <div
        className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto_var(--sheet-w,300px)] lg:grid-cols-[minmax(0,1fr)_auto_var(--sheet-w,500px)]"
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
          <PdfPages
            src={`/api/omr/${id}/file`}
            title={title}
            personal={!paper.owner}
          />
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
            options={paper.shape.options}
            ink={sheetInk(id)}
            pen={prefs.pen}
            onMark={onMark}
          />
        </section>
      </div>

      <nav
        aria-label="Switch view"
        className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden"
      >
        <SegmentedControl
          value={view}
          onValueChange={setView}
          ariaLabel="Show"
          className="min-w-0 flex-1 [&>*]:flex-1"
          options={[
            { value: "paper", label: "Paper" },
            { value: "sheet", label: `Sheet · ${count}` },
          ]}
        />
        {/* Within thumb reach on a phone; the header has it on wider screens. */}
        <Button
          variant="primary"
          disabled={count === 0}
          onClick={() => setSubmit("open")}
        >
          Submit
        </Button>
      </nav>
    </div>
  );
}
