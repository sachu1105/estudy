"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { reportQuestionAction } from "../actions";

type Reason = "WRONG_ANSWER" | "UNCLEAR" | "TYPO" | "OTHER";

/** Three reports take a question out of tests until an admin checks it. */
export function ReportQuestion({
  questionId,
  number,
}: {
  questionId: string;
  number: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("WRONG_ANSWER");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" aria-label={`Report question ${number}`}>
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
          <DialogDescription>
            An admin checks reported questions and fixes or removes them.
          </DialogDescription>
        </DialogHeader>
        <SegmentedControl
          ariaLabel="What's wrong"
          value={reason}
          onValueChange={setReason}
          options={[
            { value: "WRONG_ANSWER", label: "Wrong answer" },
            { value: "UNCLEAR", label: "Unclear" },
            { value: "TYPO", label: "Typo" },
            { value: "OTHER", label: "Other" },
          ]}
          size="sm"
          className="flex-wrap"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`report-${questionId}`}>Details (optional)</Label>
          <Textarea
            id={`report-${questionId}`}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await reportQuestionAction({
                  questionId,
                  reason,
                  note: note || null,
                });
                if (!result.ok) return void toast.error(result.error);
                toast.success(
                  result.already
                    ? "You reported this one already"
                    : "Thanks, it's reported",
                );
                setOpen(false);
              })
            }
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
