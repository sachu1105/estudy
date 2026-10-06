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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { reportAction } from "../actions";

type Reason = "spam" | "abuse" | "copyright" | "wrong" | "other";

/** Report any piece of user content to the site admins. Controlled, so menus can open it. */
export function ReportDialog({
  open,
  onOpenChange,
  target,
  what,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    type: "GROUP" | "GROUP_ITEM" | "GROUP_TEST" | "USER";
    id: string;
    groupId: string | null;
  };
  what: string;
}) {
  const [reason, setReason] = useState<Reason>("spam");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {what}</DialogTitle>
          <DialogDescription>
            The site admins look at every report. The person isn&apos;t told who
            reported.
          </DialogDescription>
        </DialogHeader>
        <SegmentedControl
          ariaLabel="Reason"
          value={reason}
          onValueChange={setReason}
          size="sm"
          className="flex-wrap"
          options={[
            { value: "spam", label: "Spam" },
            { value: "abuse", label: "Abuse" },
            { value: "copyright", label: "Copyright" },
            { value: "wrong", label: "Wrong" },
            { value: "other", label: "Other" },
          ]}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-note">Details (optional)</Label>
          <Textarea
            id="report-note"
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
                const result = await reportAction({
                  type: target.type,
                  targetId: target.id,
                  groupId: target.groupId,
                  reason,
                  note: note || null,
                });
                if (!result.ok) return void toast.error(result.error);
                toast.success("Reported. Thank you.");
                onOpenChange(false);
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
