"use client";

import { Pause } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setExamRoleAction } from "@/features/plans/actions";

/**
 * The Plan tab for an exam the user set aside. Nothing is lost and nothing is overdue
 * (rule 7): the plan is simply not taking any of the day until they pick it back up.
 */
export function PausedPlan({
  syllabusId,
  title,
}: {
  syllabusId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const resume = () =>
    start(async () => {
      const result = await setExamRoleAction({
        syllabusId,
        role: "ALONGSIDE",
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${title} is back on`);
      router.refresh();
    });

  return (
    <section
      aria-labelledby="paused-plan"
      className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-5 md:p-6"
    >
      <span className="flex size-10 items-center justify-center rounded-control bg-surface-muted text-ink-muted">
        <Pause className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 id="paused-plan" className="text-h2">
          This exam is paused
        </h2>
        <p className="text-body text-ink-muted">
          Your topics, notes and progress are all here, and your other exams
          have the time this one was taking. Pick it up whenever you want: the
          days it spent paused don&apos;t count against your timeline.
        </p>
      </div>
      <Button variant="primary" disabled={pending} onClick={resume}>
        {pending ? "Starting it again" : "Resume this exam"}
      </Button>
    </section>
  );
}
