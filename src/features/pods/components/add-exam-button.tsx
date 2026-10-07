"use client";

import { ChevronRight, Library, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

/**
 * The way to a new exam pod: pick a syllabus from the catalogue (ready-made, checked)
 * or upload your own. One button; both roads behind it.
 */
export function AddExamButton({
  uploads,
  className,
}: {
  /** Upload allowance; `limit` is Infinity when unlimited. */
  uploads: { used: number; limit: number };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const atLimit = uploads.used >= uploads.limit;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" className={className}>
          Add exam
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an exam</DialogTitle>
          <DialogDescription>
            Every subject in its syllabus becomes a pod.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Choice
            href="/syllabus/catalogue"
            icon={Library}
            title="Pick from the catalogue"
            text="Ready-made syllabuses, already checked. The quickest way in."
            onPick={() => setOpen(false)}
          />
          <Choice
            href="/syllabus/new"
            icon={Upload}
            title="Upload your syllabus"
            text={
              atLimit
                ? `You've used ${uploads.used} of ${uploads.limit} uploads on your plan. The catalogue is always open.`
                : "A PDF, a photo or pasted text. We read it, and you check the subjects."
            }
            note={
              !atLimit && Number.isFinite(uploads.limit)
                ? `${uploads.used} of ${uploads.limit} used`
                : undefined
            }
            disabled={atLimit}
            onPick={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Choice({
  href,
  icon: Icon,
  title,
  text,
  note,
  disabled = false,
  onPick,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  note?: string;
  disabled?: boolean;
  onPick: () => void;
}) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-heading text-body font-medium text-ink">
            {title}
          </span>
          {note ? (
            <span className="shrink-0 text-small text-ink-muted">{note}</span>
          ) : null}
        </span>
        <span className="text-small text-ink-muted">{text}</span>
      </span>
      {disabled ? null : (
        <ChevronRight
          className="size-4 shrink-0 self-center text-ink-subtle"
          aria-hidden
        />
      )}
    </>
  );
  const box =
    "flex items-start gap-3 rounded-control border border-border p-3 text-left";
  return disabled ? (
    <div aria-disabled className={cn(box, "opacity-60")}>
      {body}
    </div>
  ) : (
    <Link
      href={href}
      onClick={onPick}
      className={cn(
        box,
        "transition-colors duration-[120ms] hover:border-accent hover:bg-accent-soft/40",
      )}
    >
      {body}
    </Link>
  );
}
