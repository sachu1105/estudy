"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The way out of a paper. Outside an exam it just waits for the last mark to save.
 * During one, leaving ends the sitting, as in the hall: the back arrow and the
 * browser's back button ask first, and leaving resets the timer. A tab close or reload
 * gets the browser's own warning (no page may show its own there); if they go anyway,
 * the timer resets when the paper next opens.
 */
export function LeaveExam({
  inExam,
  dirty,
  flush,
  endSitting,
}: {
  inExam: boolean;
  /** Marks not yet saved. */
  dirty: () => boolean;
  flush: () => Promise<void>;
  /** Resets the timer; resolves once the server has it. */
  endSitting: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const left = useRef(false);

  useEffect(() => {
    if (!inExam) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!left.current) e.preventDefault();
    };
    // Browser back: an extra entry for this page holds it, and the box asks instead.
    window.history.pushState(window.history.state, "", window.location.href);
    const back = () => {
      if (left.current) return;
      window.history.pushState(window.history.state, "", window.location.href);
      setAsking(true);
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", back);
    };
  }, [inExam]);

  async function leave() {
    setLeaving(true);
    left.current = true;
    await flush();
    await endSitting();
    router.push("/tests");
  }

  return (
    <>
      <Link
        href="/tests"
        aria-label={
          inExam ? "Leave the exam" : "Back to tests (your marks are kept)"
        }
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          if (inExam) {
            e.preventDefault();
            return setAsking(true);
          }
          // Let the last mark land first, so the list shows it.
          if (!dirty()) return;
          e.preventDefault();
          void flush().then(() => router.push("/tests"));
        }}
        className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>

      <Dialog
        open={asking}
        onOpenChange={(open) => !leaving && setAsking(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave the exam?</DialogTitle>
            <DialogDescription>
              Leaving ends this sitting, as it would in the hall. The timer
              resets; the answers you marked stay on the sheet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={leaving} onClick={() => setAsking(false)}>
              Stay in the exam
            </Button>
            <Button variant="danger" disabled={leaving} onClick={leave}>
              {leaving ? "Leaving" : "Leave and reset timer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
