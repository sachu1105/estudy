"use client";

import { Megaphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

import { manageExamAction } from "../exam-actions";

type Change =
  { op: "publish" } | { op: "names"; show: boolean } | { op: "stop" };

/** For whoever shared the exam: results out now, names on the list, or stop sharing. */
export function ExamHostControls({
  id,
  released,
  showNames,
}: {
  id: string;
  released: boolean;
  showNames: boolean;
}) {
  const router = useRouter();
  const switchId = useId();
  const [pending, start] = useTransition();
  const [stopping, setStopping] = useState(false);
  const run = (change: Change, done?: () => void) =>
    start(async () => {
      const result = await manageExamAction({ id, change });
      if (!result.ok) return void toast.error(result.error);
      done?.();
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="font-heading text-h3">Running this exam</h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <Label htmlFor={switchId} className="text-body">
            Names on the rank list
          </Label>
          <span className="text-small text-ink-muted">
            Off: everyone else sees register numbers only.
          </span>
        </div>
        <Switch
          id={switchId}
          checked={showNames}
          disabled={pending}
          onCheckedChange={(show) => run({ op: "names", show })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {released ? null : (
          <Button disabled={pending} onClick={() => run({ op: "publish" })}>
            <Megaphone aria-hidden /> Publish results now
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => setStopping(true)}
        >
          <Trash2 aria-hidden /> Stop sharing
        </Button>
      </div>
      <Dialog open={stopping} onOpenChange={setStopping}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop sharing this exam?</DialogTitle>
            <DialogDescription>
              It leaves the squad: nobody can sit it or see its rank list. Your
              paper and its key stay yours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setStopping(false)}>Keep sharing</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run({ op: "stop" }, () => router.push("/tests"))}
            >
              Stop sharing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
