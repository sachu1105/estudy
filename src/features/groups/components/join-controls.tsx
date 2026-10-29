"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

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

/** Join an open squad, or ask to join one that asks (answering its question). */
export function JoinButton({
  groupId,
  asks,
  question,
  requested,
}: {
  groupId: string;
  asks: boolean;
  question: string | null;
  requested: boolean;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  if (requested)
    return (
      <p className="text-body text-ink-muted">
        Request sent. An admin of the squad decides.
      </p>
    );
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await joinGroupAction({
            groupId,
            ...(asks ? { answer } : {}),
          });
          if (!result.ok) return void toast.error(result.error);
          toast.success(result.joined ? "You're in" : "Request sent");
          router.refresh();
        });
      }}
    >
      {asks && question ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="join-answer">{question}</Label>
          <Input
            id="join-answer"
            value={answer}
            maxLength={300}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        disabled={pending}
      >
        {asks ? "Ask to join" : "Join squad"}
      </Button>
    </form>
  );
}

/** Type an invite code a friend gave you; joining opens the squad. */
export function JoinCodeForm({ footer }: { footer?: ReactNode }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await joinByCodeAction({ code });
          if (!result.ok) return void toast.error(result.error);
          router.push(`/groups/${result.groupId}`);
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          value={code}
          maxLength={12}
          autoCapitalize="characters"
          placeholder="AX2RW67F"
          className="font-mono uppercase"
          onChange={(e) => setCode(e.target.value)}
        />
        <p className="text-small text-ink-muted">
          The 8 letters and numbers a friend sent you. Opening their invite link
          works too.
        </p>
      </div>
      <DialogFooter>
        {footer}
        <Button
          type="submit"
          variant="primary"
          disabled={pending || code.trim().length < 6}
        >
          Join
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Join with a code, from its own button. */
export function JoinCodeDialog({
  label = "Join with a code",
}: {
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join with a code</DialogTitle>
        </DialogHeader>
        <JoinCodeForm />
      </DialogContent>
    </Dialog>
  );
}
