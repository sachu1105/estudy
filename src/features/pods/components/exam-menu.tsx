"use client";

import { MoreHorizontal, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { startPlanAction } from "@/features/plans/actions";

import { deleteExamAction } from "../actions";

/** The exam pod's less frequent actions: change the plan, delete the whole exam. */
export function ExamMenu({
  examId,
  title,
  subjects,
  items,
  ownUpload,
  hasPlan,
}: {
  examId: string;
  title: string;
  subjects: number;
  items: number;
  /** The user uploaded this syllabus (rather than adding it from the catalogue). */
  ownUpload: boolean;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const changePlan = () =>
    start(async () => {
      const result = await startPlanAction({ syllabusId: examId });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/plan/new/${result.draftId}/timeline`);
    });

  const remove = () =>
    start(async () => {
      const result = await deleteExamAction({ syllabusId: examId });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        result.kept > 0
          ? `${title} deleted. ${result.kept} pod${result.kept === 1 ? "" : "s"} with material kept.`
          : `${title} deleted`,
      );
      router.push("/pods");
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More for ${title}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasPlan ? (
            <DropdownMenuItem disabled={pending} onSelect={changePlan}>
              <SlidersHorizontal aria-hidden /> Change plan
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setConfirming(true)}>
            <Trash2 aria-hidden /> Delete exam pod
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {title}?</DialogTitle>
            <DialogDescription>
              {hasPlan ? "Its study plan stops and its" : "Its"} {subjects}{" "}
              subject pod{subjects === 1 ? "" : "s"}{" "}
              {subjects === 1 ? "goes" : "go"}.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
            {items > 0 ? (
              <li>
                Your {items} item{items === 1 ? "" : "s"} of material{" "}
                {items === 1 ? "is" : "are"} kept: the pods holding them move to
                your own pods.
              </li>
            ) : null}
            <li>Your XP, streak and study time are kept.</li>
            <li>
              {ownUpload
                ? "The syllabus you uploaded is deleted and stops counting toward your uploads."
                : "The syllabus stays in the catalogue; you can add it again."}
            </li>
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={pending} onClick={remove}>
              {pending ? "Deleting" : "Delete exam pod"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
