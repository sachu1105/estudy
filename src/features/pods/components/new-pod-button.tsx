"use client";

import { Plus } from "lucide-react";
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
import { FieldError, Input, Label } from "@/components/ui/input";

import { createPodAction } from "../actions";

/** A pod of the user's own, for anything outside the syllabus. */
export function NewPodButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const result = await createPodAction({ name });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      router.push(`/pods/${result.podId}`);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus aria-hidden /> New pod
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <DialogHeader>
            <DialogTitle>New pod</DialogTitle>
            <DialogDescription>
              For anything outside the syllabus: previous papers, current
              affairs notes, interview prep.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pod-name">Name</Label>
            <Input
              id="pod-name"
              value={name}
              maxLength={80}
              autoFocus
              aria-invalid={Boolean(error) || undefined}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !name.trim()}
            >
              {pending ? "Creating" : "Create pod"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
