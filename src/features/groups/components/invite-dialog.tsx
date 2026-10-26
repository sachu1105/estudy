"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { squadCover } from "@/lib/squads/cover";

import { joinByCodeAction, previewInviteAction } from "../actions";

type Preview = Extract<
  Awaited<ReturnType<typeof previewInviteAction>>,
  { ok: true }
>;

/** "Join this squad?" for an invite link clicked inside the app: look first, then join. */
export function InviteDialog({
  code,
  open,
  onOpenChange,
}: {
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    void previewInviteAction({ code }).then((result) => {
      if (!live) return;
      if (result.ok) setPreview(result);
      else setError(result.error);
    });
    return () => {
      live = false;
    };
  }, [code]);

  const go = (groupId: string) => {
    onOpenChange(false);
    router.push(`/groups/${groupId}`);
  };
  const join = () =>
    start(async () => {
      const result = await joinByCodeAction({ code });
      if (!result.ok) return void toast.error(result.error);
      toast.success(`You joined ${preview?.group.name ?? "the squad"}`);
      go(result.groupId);
    });

  const group = preview?.group;
  const facts = group
    ? [group.exam, `${group.members} member${group.members === 1 ? "" : "s"}`]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {group ? (
          <PodCover
            cover={squadCover({ id: group.id, cover: group.cover })}
            className="-mx-5 -mt-5 mb-4 h-16 sm:-mx-6 sm:-mt-6"
          />
        ) : null}
        <DialogHeader>
          <DialogTitle>
            {error
              ? "That invite doesn't work"
              : group
                ? preview.member
                  ? `You're already in ${group.name}`
                  : `Join ${group.name}?`
                : "Squad invite"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-1">
              {error ? (
                <span>{error}</span>
              ) : group ? (
                <>
                  <span>{facts}</span>
                  {group.description ? (
                    <span className="line-clamp-3">{group.description}</span>
                  ) : null}
                </>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {error ? "Close" : "Not now"}
          </Button>
          {group ? (
            preview.member ? (
              <Button variant="primary" onClick={() => go(group.id)}>
                Open squad
              </Button>
            ) : (
              <Button variant="primary" disabled={pending} onClick={join}>
                {pending ? "Joining" : "Join squad"}
              </Button>
            )
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
