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
import { toast } from "@/components/ui/toast";

import { joinByCodeAction, joinGroupAction } from "../actions";

/** Join a public group, or ask to join a private one. */
export function JoinButton({
  groupId,
  privateGroup,
  requested,
}: {
  groupId: string;
  privateGroup: boolean;
  requested: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (requested)
    return (
      <p className="text-body text-ink-muted">
        Request sent. An admin of the squad decides.
      </p>
    );
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await joinGroupAction({ groupId });
          if (!result.ok) return void toast.error(result.error);
          toast.success(result.joined ? "You're in" : "Request sent");
          router.refresh();
        })
      }
    >
      {privateGroup ? "Ask to join" : "Join squad"}
    </Button>
  );
}

/** Type an invite code a friend gave you. */
export function JoinCodeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Join with a code</Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await joinByCodeAction({ code });
              if (!result.ok) return void toast.error(result.error);
              setOpen(false);
              router.push(`/groups/${result.groupId}`);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Join with a code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              value={code}
              maxLength={12}
              autoCapitalize="characters"
              className="font-mono uppercase"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || code.trim().length < 6}
            >
              Join
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
