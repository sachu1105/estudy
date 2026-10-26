"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  blankMarks,
  markedCount,
  toggleMark,
  type Marks,
} from "@/lib/omr/marks";
import { cn } from "@/lib/utils/cn";

import { ClearSheetButton } from "./clear-sheet-button";
import { OmrGrid } from "./omr-grid";
import { PdfPages } from "./pdf-pages";
import { useSavedMarks } from "./use-saved-marks";

type View = "paper" | "sheet";

/**
 * The paper on the left, the OMR sheet on the right. On a phone they share the screen
 * one at a time, switched from the bar at the bottom. Marks save as you go.
 */
export function OmrWorkspace({
  id,
  title,
  initialMarks,
}: {
  id: string;
  title: string;
  initialMarks: Marks;
}) {
  const router = useRouter();
  const { marks, setMarks, saving, dirty, flush } = useSavedMarks(
    id,
    initialMarks,
  );
  const [view, setView] = useState<View>("paper");

  const onMark = useCallback(
    (question: number, option: number) =>
      setMarks((m) => toggleMark(m, question, option)),
    [setMarks],
  );
  const count = markedCount(marks);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 md:px-4">
        <Link
          href="/tests"
          aria-label="Back to tests (your marks are kept)"
          onClick={(e) => {
            // Let the last mark land first, so the list shows it.
            if (!dirty() || e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            void flush().then(() => router.push("/tests"));
          }}
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
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
          className="shrink-0 font-mono text-small tabular-nums"
          aria-label={`${count} of ${marks.length} marked`}
        >
          {count}/{marks.length}
        </span>
        <ClearSheetButton
          disabled={count === 0}
          onClear={() => setMarks(blankMarks())}
        />
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_500px]">
        <section
          aria-label="Question paper"
          className={cn(
            "min-h-0",
            view === "paper" ? "block" : "hidden md:block",
          )}
        >
          <PdfPages src={`/api/omr/${id}/file`} title={title} />
        </section>
        <section
          aria-label="OMR answer sheet"
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain border-border bg-bg p-4 md:border-l",
            view === "sheet" ? "block" : "hidden md:block",
          )}
        >
          <OmrGrid marks={marks} onMark={onMark} />
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
