"use client";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

import { promoteAction } from "../actions";

/**
 * Copies a confirmed upload into the catalogue. The copy waits for review like any other
 * catalogue syllabus (rule 5); the user's own syllabus is untouched.
 */
export function PromoteForm({
  sourceId,
  title,
  exams,
}: {
  sourceId: string;
  title: string;
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title);
  const [examId, setExamId] = useState("none");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" aria-label={`Promote ${title}`}>
          Promote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await promoteAction({
                sourceId,
                title: name,
                examId: examId === "none" ? null : examId,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success("Copied to the catalogue for review");
              setOpen(false);
              router.push(`/admin/catalogue/${result.id}`);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Promote to the catalogue</DialogTitle>
            <DialogDescription>
              A copy goes to the review queue. Nobody else sees it until
              it&apos;s approved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="promote-title">Title in the catalogue</Label>
            <Input
              id="promote-title"
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="promote-exam">Exam</Label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger id="promote-exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No exam</SelectItem>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" disabled={pending}>
              Send for review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
