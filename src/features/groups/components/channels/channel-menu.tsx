"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { deleteChannelAction, moveChannelAction } from "../../channel-actions";
import { AccessDialog } from "./access-dialog";
import { ChannelDialog } from "./channel-dialog";
import type { ChannelSummary } from "./channel-icon";

/** An admin's menu on one channel: edit, move up or down, delete. */
export function ChannelMenu({
  groupId,
  channel,
  categories,
  first,
  last,
  label = `Manage #${channel.name}`,
}: {
  groupId: string;
  channel: ChannelSummary;
  categories: { id: string; name: string }[];
  first: boolean;
  last: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done?: string,
    then?: () => void,
  ) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      if (done) toast.success(done);
      if (then) then();
      else router.refresh();
    });
  const move = (direction: "up" | "down") =>
    run(() => moveChannelAction({ groupId, channelId: channel.id, direction }));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={label}
          disabled={pending}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:size-8"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            Edit channel
          </DropdownMenuItem>
          {channel.viewRule === "PICKED" ? (
            <DropdownMenuItem onSelect={() => setPicking(true)}>
              Who&apos;s let in
            </DropdownMenuItem>
          ) : null}
          {first ? null : (
            <DropdownMenuItem onSelect={() => move("up")}>
              Move up
            </DropdownMenuItem>
          )}
          {last ? null : (
            <DropdownMenuItem onSelect={() => move("down")}>
              Move down
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => deleteChannelAction({ groupId, channelId: channel.id }),
                "Channel deleted",
                () => router.push(`/groups/${groupId}`),
              )
            }
          >
            Delete channel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {picking ? (
        <AccessDialog
          groupId={groupId}
          channelId={channel.id}
          channelName={channel.name}
          open={picking}
          onOpenChange={setPicking}
        />
      ) : null}
      {editing ? (
        <ChannelDialog
          groupId={groupId}
          categories={categories}
          channel={channel}
          open={editing}
          onOpenChange={setEditing}
        />
      ) : null}
    </>
  );
}
