"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

import { createInviteAction, revokeInviteAction } from "../actions";
import { InviteRow, type Invite } from "./invite-row";

/** Invite codes and links: how long they last, how many can use them, and revoking. */
export function InvitesPanel({
  groupId,
  invites,
  timeZone,
}: {
  groupId: string;
  invites: Invite[];
  timeZone: string;
}) {
  const router = useRouter();
  const [days, setDays] = useState("7");
  const [uses, setUses] = useState("0");
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const result = await createInviteAction({
        groupId,
        days: days === "0" ? null : Number(days),
        maxUses: uses === "0" ? null : Number(uses),
      });
      if (!result.ok) return void toast.error(result.error);
      const url = `${window.location.origin}/groups/join/${result.code}`;
      await navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Invite made, link copied"))
        .catch(() => toast.success("Invite made"));
      router.refresh();
    });

  const revoke = (inviteId: string) =>
    start(async () => {
      const result = await revokeInviteAction({ groupId, inviteId });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Invite revoked");
      router.refresh();
    });

  return (
    <section aria-labelledby="invites" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="invites" className="text-h3">
          Invites
        </h2>
        <p className="text-small text-ink-muted">
          Send a link, or a code friends type under Join with a code.
        </p>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {invites.length > 0 ? (
          <ul className="divide-y divide-border">
            {invites.map((i) => (
              <InviteRow
                key={i.id}
                invite={i}
                timeZone={timeZone}
                pending={pending}
                onRevoke={() => revoke(i.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-body text-ink-muted">
            No invites yet. Make one and send it to a friend.
          </p>
        )}
        <div className="grid grid-cols-2 items-end gap-2 border-t border-border bg-surface-muted/50 p-3 sm:flex sm:px-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="invite-days">Lasts</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="invite-days" className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="0">No end</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="invite-uses">People</Label>
            <Select value={uses} onValueChange={setUses}>
              <SelectTrigger id="invite-uses" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 person</SelectItem>
                <SelectItem value="10">10 people</SelectItem>
                <SelectItem value="0">Anyone with it</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* The page's one primary action until there's an invite to send. */}
          <Button
            variant={invites.length > 0 ? "secondary" : "primary"}
            disabled={pending}
            onClick={create}
            className="col-span-2 sm:ml-auto"
          >
            New invite
          </Button>
        </div>
      </div>
    </section>
  );
}
