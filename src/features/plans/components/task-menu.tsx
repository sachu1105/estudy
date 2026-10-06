"use client";

import {
  CalendarDays,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Timer,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Input, Label } from "@/components/ui/input";

import { editTaskAction, resetTaskAction } from "../actions";
import { useReplan } from "../use-replan";

type Edit =
  | { kind: "MOVE"; date: string }
  | { kind: "RESIZE"; minutes: number }
  | { kind: "LOCK" };

/**
 * Hand edits to one task (rule 14): move it, change its minutes, keep it on its day, or
 * go back to what the plan suggested. Every later re-plan remembers them.
 */
export function TaskMenu({
  taskId,
  title,
  date,
  minutes,
  pinned,
  today,
  end,
}: {
  taskId: string;
  title: string;
  date: string;
  minutes: number;
  pinned: boolean;
  today: string;
  end: string;
}) {
  const { run, pending } = useReplan();
  const [dialog, setDialog] = useState<"move" | "resize" | null>(null);
  const [day, setDay] = useState(date);
  const [length, setLength] = useState(minutes);

  const edit = (change: Edit, done: string) =>
    run(() => editTaskAction({ taskId, edit: change }), done).then(
      (ok) => ok && setDialog(null),
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:size-9"
            aria-label={`Change ${title}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("move")}>
            <CalendarDays aria-hidden /> Move to another day
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("resize")}>
            <Timer aria-hidden /> Change minutes
          </DropdownMenuItem>
          {pinned ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => resetTaskAction({ taskId }),
                  "Back to the suggested plan",
                )
              }
            >
              <RotateCcw aria-hidden /> Reset to suggested
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => edit({ kind: "LOCK" }, "Kept on this day")}
            >
              <Lock aria-hidden /> Keep it on this day
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (dialog === "move")
                void edit({ kind: "MOVE", date: day }, "Task moved");
              else
                void edit(
                  { kind: "RESIZE", minutes: length },
                  "Minutes changed",
                );
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog === "move" ? "Move to another day" : "Change minutes"}
              </DialogTitle>
            </DialogHeader>
            {dialog === "move" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-day">Day</Label>
                <Input
                  id="task-day"
                  type="date"
                  min={today}
                  max={end}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-minutes">Minutes</Label>
                <Input
                  id="task-minutes"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={600}
                  step={5}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                />
              </div>
            )}
            <p className="text-small text-ink-muted">
              The rest of the plan moves around it, and later re-plans keep it.
            </p>
            <DialogFooter>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
