"use client";

import { ChevronRight, Library, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

/** The first step of Add exam: the catalogue, or an upload of your own. */
export function ChooseStep({
  uploads,
  onUpload,
}: {
  /** Upload allowance; `limit` is Infinity when unlimited. */
  uploads: { used: number; limit: number };
  onUpload: () => void;
}) {
  const atLimit = uploads.used >= uploads.limit;
  return (
    <>
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
        />
        <Choice
          onClick={atLimit ? undefined : onUpload}
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
        />
      </div>
    </>
  );
}

function Choice({
  href,
  onClick,
  icon: Icon,
  title,
  text,
  note,
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  text: string;
  note?: string;
}) {
  const disabled = !href && !onClick;
  const body: ReactNode = (
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
    "flex w-full items-start gap-3 rounded-control border border-border p-3 text-left";
  const live = cn(
    box,
    "cursor-pointer transition-colors duration-[120ms] hover:border-accent hover:bg-accent-soft/40",
  );
  if (disabled)
    return (
      <div aria-disabled className={cn(box, "opacity-60")}>
        {body}
      </div>
    );
  return href ? (
    <Link href={href} className={live}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={live}>
      {body}
    </button>
  );
}
