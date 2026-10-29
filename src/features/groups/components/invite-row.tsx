"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type Invite = {
  id: string;
  code: string;
  uses: number;
  maxUses: number | null;
  expiresAt: Date | null;
};

const subscribe = () => () => {};

const link = (code: string) => `${window.location.origin}/groups/join/${code}`;

/** "Anyone with it · 0 used · ends 4 Nov": who can use it, how many have, and when it stops. */
function details(invite: Invite, timeZone: string) {
  const who =
    invite.maxUses === null
      ? "Anyone with it"
      : invite.maxUses === 1
        ? "1 person"
        : `${invite.maxUses} people`;
  const used =
    invite.maxUses === null
      ? `${invite.uses} used`
      : `${invite.uses} of ${invite.maxUses} used`;
  const ends = invite.expiresAt
    ? `ends ${invite.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone })}`
    : "never ends";
  return `${who} · ${used} · ${ends}`;
}

/** An action's icon, swapped for a tick for a moment after it worked. */
function Tick({ on, Icon }: { on: boolean; Icon: typeof Copy }) {
  return on ? (
    <Check className="text-success" aria-hidden />
  ) : (
    <Icon aria-hidden />
  );
}

/**
 * One invite: the code (tap to copy it, for "Join with a code"), the full link, the
 * phone's share sheet where there is one, and revoking.
 */
export function InviteRow({
  invite,
  timeZone,
  pending,
  onRevoke,
}: {
  invite: Invite;
  timeZone: string;
  pending: boolean;
  onRevoke: () => void;
}) {
  const { code } = invite;
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const canShare = useSyncExternalStore(
    subscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  const copy = (what: "code" | "link") =>
    void navigator.clipboard
      .writeText(what === "code" ? code : link(code))
      .then(() => {
        toast.success(what === "code" ? "Code copied" : "Link copied");
        setCopied(what);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => toast.error(`Copy this code instead: ${code}`));

  const share = () =>
    void navigator
      .share({
        title: "Join my squad on studypods",
        text: `Join my squad on studypods. Invite code: ${code}`,
        url: link(code),
      })
      .catch(() => {});

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          aria-label={`Copy the code ${code}`}
          onClick={() => copy("code")}
          className="-mx-2 inline-flex min-h-11 cursor-pointer items-center gap-3 self-start rounded-control px-2 text-ink transition-colors duration-[120ms] hover:bg-surface-muted"
        >
          <span className="font-mono text-h2 tracking-[0.12em] tabular-nums">
            {code}
          </span>
          <span className="text-ink-muted [&_svg]:size-4">
            <Tick on={copied === "code"} Icon={Copy} />
          </span>
        </button>
        <p className="text-small text-ink-muted">{details(invite, timeZone)}</p>
      </div>
      <div className="-mx-2 flex flex-wrap items-center gap-1 sm:mx-0">
        <Button variant="ghost" onClick={() => copy("link")}>
          <Tick on={copied === "link"} Icon={Link2} />
          Copy link
        </Button>
        {canShare ? (
          <Button variant="ghost" onClick={share}>
            <Share2 aria-hidden />
            Share
          </Button>
        ) : null}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={onRevoke}
          aria-label={`Revoke ${code}`}
          className="hover:text-danger-ink"
        >
          Revoke
        </Button>
      </div>
    </li>
  );
}
