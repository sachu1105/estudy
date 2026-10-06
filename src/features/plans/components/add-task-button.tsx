"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";

import { addCustomTaskAction } from "../actions";
import { useReplan } from "../use-replan";

/** A task of the user's own on one day, like an old question paper. */
export function AddTaskButton({
  syllabusId,
  date,
  dayLabel,
}: {
  syllabusId: string;
  date: string;
  dayLabel: string;
}) {
  const { run, pending } = useReplan();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" aria-label={`Add a task on ${dayLabel}`}>
          <Plus aria-hidden /> Add a task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () => addCustomTaskAction({ syllabusId, date, minutes, title }),
              "Task added",
            ).then((ok) => ok && setOpen(false));
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a task on {dayLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-title">What</Label>
            <Input
              id="custom-title"
              value={title}
              maxLength={120}
              placeholder="Solve the 2023 LDC paper"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-minutes">Minutes</Label>
            <Input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !title.trim()}
            >
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
