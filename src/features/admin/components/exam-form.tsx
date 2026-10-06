"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { saveExamAction } from "../actions";

type Exam = {
  id: string;
  name: string;
  board: string;
  description: string | null;
};

/** Creates an exam, or edits one when `exam` is given. */
export function ExamForm({ exam }: { exam?: Exam }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(exam?.name ?? "");
  const [board, setBoard] = useState(exam?.board ?? "Kerala PSC");
  const [description, setDescription] = useState(exam?.description ?? "");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await saveExamAction({
        id: exam?.id ?? null,
        name,
        board,
        description,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(exam ? "Exam saved" : "Exam added");
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={exam ? "ghost" : "secondary"}
          aria-label={exam ? `Edit ${exam.name}` : undefined}
        >
          {exam ? "Edit" : "Add exam"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <DialogHeader>
            <DialogTitle>{exam ? "Edit exam" : "Add an exam"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-name">Name</Label>
            <Input
              id="exam-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="LD Clerk"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-board">Board</Label>
            <Input
              id="exam-board"
              value={board}
              maxLength={60}
              onChange={(e) => setBoard(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-description">Description</Label>
            <Textarea
              id="exam-description"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
