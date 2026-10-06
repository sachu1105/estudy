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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type Result = { ok: true } | { ok: false; error: string };

/** Confirms an admin action and asks why; the reason goes in the audit log. */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirm,
  danger = false,
  run,
  done,
}: {
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  danger?: boolean;
  run: (reason: string) => Promise<Result>;
  done: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={danger ? "danger" : "secondary"}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await run(reason);
              if (!result.ok) return void toast.error(result.error);
              toast.success(done);
              setOpen(false);
              setReason("");
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-reason">Reason</Label>
            <Textarea
              id="admin-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What happened, for the audit log"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant={danger ? "danger" : "primary"}
              disabled={pending || reason.trim().length < 3}
            >
              {confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
