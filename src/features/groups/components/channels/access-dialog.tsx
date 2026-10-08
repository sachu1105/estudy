"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ROLE_LABELS, type GroupRole } from "@/lib/squads/roles";
import { cn } from "@/lib/utils/cn";

import { setChannelAccessAction } from "../../channel-actions";

type Member = {
  id: string;
  name: string;
  role: GroupRole;
  picked: boolean;
  /** Staff are in every channel; they can't be taken out. */
  always: boolean;
};

/** Who a private channel lets in. Staff are always in, so they're shown but fixed. */
export function AccessDialog({
  groupId,
  channelId,
  channelName,
  open,
  onOpenChange,
}: {
  groupId: string;
  channelId: string;
  channelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let live = true;
    void fetch(`/api/groups/${groupId}/channels/${channelId}/access`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { members: Member[] } | null) => {
        if (!live || !data) return;
        setMembers(data.members);
        setPicked(
          new Set(data.members.filter((m) => m.picked).map((m) => m.id)),
        );
      });
    return () => {
      live = false;
    };
  }, [open, groupId, channelId]);

  const toggle = (id: string) =>
    setPicked((all) => {
      const next = new Set(all);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await setChannelAccessAction({
                groupId,
                channelId,
                userIds: [...picked],
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success("Saved who's let in");
              onOpenChange(false);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Who&apos;s in #{channelName}</DialogTitle>
          </DialogHeader>
          {members === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
          ) : (
            <ul className="-mx-2 max-h-[50dvh] scrollbar-thin overflow-y-auto">
              {members.map((m) => (
                <li key={m.id}>
                  {/* One button for the whole row: a checkbox inside a label would
                      toggle twice on a click. */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={m.always || picked.has(m.id)}
                    aria-label={
                      m.role === "MEMBER"
                        ? m.name
                        : `${m.name}, ${ROLE_LABELS[m.role]}`
                    }
                    disabled={m.always}
                    onClick={() => toggle(m.id)}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-2 text-left hover:bg-surface-muted disabled:cursor-not-allowed"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-[6px] border",
                        m.always || picked.has(m.id)
                          ? "border-accent bg-accent text-on-accent"
                          : "border-border bg-surface",
                        m.always && "opacity-60",
                      )}
                    >
                      {m.always || picked.has(m.id) ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body">
                      {m.name}
                    </span>
                    {m.role !== "MEMBER" ? (
                      <span className="text-small text-ink-muted">
                        {ROLE_LABELS[m.role]}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
