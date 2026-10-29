"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateSquadForm } from "./create-squad-form";
import { JoinCodeForm } from "./join-controls";

/**
 * A new squad: who it's for, the channels it starts with, and who can join. As in
 * Discord, someone holding an invite can switch to joining with its code instead.
 */
export function CreateGroupDialog({
  exams,
  trigger,
  atLimit,
}: {
  exams: { id: string; name: string }[];
  /** Replaces the default button, so the same dialog can open from a rail tile. */
  trigger?: ReactNode;
  /** Shown in place of the form once someone has made every squad their plan allows. */
  atLimit?: ReactNode;
}) {
  const [joining, setJoining] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setJoining(false);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary">
            <Plus aria-hidden /> Create squad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {joining ? (
          <>
            <DialogHeader>
              <DialogTitle>Join a squad</DialogTitle>
              <DialogDescription>
                Type the invite code a friend sent you.
              </DialogDescription>
            </DialogHeader>
            <JoinCodeForm
              footer={
                <Button variant="ghost" onClick={() => setJoining(false)}>
                  Back
                </Button>
              }
            />
          </>
        ) : atLimit ? (
          <>
            <DialogHeader>
              <DialogTitle>Create your squad</DialogTitle>
            </DialogHeader>
            {atLimit}
            <HaveInvite onJoin={() => setJoining(true)} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create your squad</DialogTitle>
              <DialogDescription>
                Where you and your friends study together.
              </DialogDescription>
            </DialogHeader>
            <CreateSquadForm exams={exams} onCreated={() => setOpen(false)} />
            <HaveInvite onJoin={() => setJoining(true)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The foot of the dialog, as in Discord: holding an invite, join instead. */
function HaveInvite({ onJoin }: { onJoin: () => void }) {
  return (
    <p className="-mt-1 flex flex-wrap items-center justify-center gap-x-1 text-small text-ink-muted">
      Have an invite already?
      <button
        type="button"
        onClick={onJoin}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-chip px-1 font-medium text-accent-ink hover:underline md:min-h-8"
      >
        Join a squad
      </button>
    </p>
  );
}
