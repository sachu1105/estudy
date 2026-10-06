"use client";

import { Copy } from "lucide-react";
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

type Invite = {
  id: string;
  code: string;
  uses: number;
  maxUses: number | null;
  expiresAt: Date | null;
};

/** Invite codes and links: how long they last, how many can use them, and revoking. */
export function InvitesPanel({
  groupId,
  invites,
}: {
  groupId: string;
  invites: Invite[];
}) {
  const router = useRouter();
  const [days, setDays] = useState("7");
  const [uses, setUses] = useState("0");
  const [pending, start] = useTransition();
  const link = (code: string) =>
    typeof window === "undefined"
      ? `/groups/join/${code}`
      : `${window.location.origin}/groups/join/${code}`;
  const copy = (code: string) =>
    void navigator.clipboard
      .writeText(link(code))
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error(`Copy this code instead: ${code}`));

  return (
    <section aria-labelledby="invites" className="flex flex-col gap-3">
      <h2 id="invites" className="text-h3">
        Invites
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-days">Lasts</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="invite-days" className="w-36">
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
            <SelectTrigger id="invite-uses" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 person</SelectItem>
              <SelectItem value="10">10 people</SelectItem>
              <SelectItem value="0">Anyone with it</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await createInviteAction({
                groupId,
                days: days === "0" ? null : Number(days),
                maxUses: uses === "0" ? null : Number(uses),
              });
              if (!result.ok) return void toast.error(result.error);
              copy(result.code);
              router.refresh();
            })
          }
        >
          New invite
        </Button>
      </div>
      {invites.length > 0 ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {invites.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2"
            >
              <span className="font-mono text-body tracking-wider">
                {i.code}
              </span>
              <span className="min-w-0 flex-1 text-small text-ink-muted">
                {i.uses}
                {i.maxUses ? ` of ${i.maxUses}` : ""} used
                {i.expiresAt
                  ? ` · until ${i.expiresAt.toISOString().slice(0, 10)}`
                  : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Copy the link for ${i.code}`}
                onClick={() => copy(i.code)}
              >
                <Copy aria-hidden />
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await revokeInviteAction({
                      groupId,
                      inviteId: i.id,
                    });
                    if (!result.ok) return void toast.error(result.error);
                    toast.success("Invite revoked");
                    router.refresh();
                  })
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
