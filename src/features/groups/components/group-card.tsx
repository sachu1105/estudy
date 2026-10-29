import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { COVER_PRESETS, type CoverPreset } from "@/lib/pods/covers";
import { joinModeOf, type JoinMode } from "@/lib/squads/access";
import { priceLabel } from "@/lib/squads/pay";
import { squadCover } from "@/lib/squads/cover";
import { ROLE_LABELS, type GroupRole } from "@/lib/squads/roles";
import { cn } from "@/lib/utils/cn";

import { PaidMark } from "./pay/paid-mark";

const JOIN_LABEL: Record<JoinMode, string> = {
  OPEN: "Open",
  REQUEST: "Asks to join",
  INVITE_ONLY: "Invite only",
};

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? words[0]![0]! + words[1]![0]!
      : (words[0] ?? "?").slice(0, 2)
  ).toUpperCase();
}

type Member = {
  user: { id: string; displayName: string; avatarUrl: string | null };
};

/**
 * The first few faces, overlapping, with the rest as a count. Each face sits on top of
 * the next, so initials are never covered (a photo can lose its edge, two letters can't).
 * A ring in the card's colour cuts the faces apart without shrinking them, and initials
 * sit on the accent tint so the circle shows on the card in both themes.
 */
function Faces({ members, total }: { members: Member[]; total: number }) {
  const shown = members.slice(0, 4);
  const rest = total - shown.length;
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex pl-0.5">
        {shown.map((m, i) => (
          <Avatar
            key={m.user.id}
            name={m.user.displayName}
            src={m.user.avatarUrl}
            size="sm"
            className={cn(
              "relative bg-accent-soft ring-2 ring-surface [&_span]:text-accent-ink",
              i > 0 && "-ml-1.5",
              ["z-4", "z-3", "z-2", "z-1"][i],
            )}
          />
        ))}
      </span>
      <span className="text-small text-ink-muted">
        {rest > 0 ? `+${rest}` : `${total} member${total === 1 ? "" : "s"}`}
      </span>
    </span>
  );
}

/**
 * A squad at a glance: its own cover art, the faces already in it, its exam and how to
 * get in. The whole card opens the squad; an action (Join) sits on top of it.
 *
 * Shaped like a pod card, which is the app's card idiom: art on top, a tile straddling
 * its edge, the content below.
 */
export function GroupCard({
  group,
  role,
  unread = false,
  verified = false,
  action,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    joinMode: JoinMode;
    exam: { name: string } | null;
    /** lib/pods/covers storedCoverSchema, or null for the automatic gradient. */
    cover?: unknown;
    members?: Member[];
    _count: { members: number };
    /** A paid squad's pass. Null: free. */
    pricePaise?: number | null;
    accessDays?: number | null;
  };
  role?: GroupRole | null;
  /** Run by someone on a paid plan. */
  verified?: boolean;
  /** Something new in its chats. */
  unread?: boolean;
  action?: ReactNode;
}) {
  const art = squadCover(group);
  // The tile behind the initials takes the gradient's base, or stays neutral on a photo.
  const tile: string | undefined =
    art.kind === "gradient"
      ? COVER_PRESETS[art.preset as CoverPreset].base
      : undefined;
  const paid = group.pricePaise != null;
  const facts = [
    group.exam?.name,
    role
      ? null
      : paid
        ? priceLabel(group.pricePaise!, group.accessDays ?? null)
        : JOIN_LABEL[joinModeOf(group)],
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow] duration-[120ms] focus-within:ring-2 focus-within:ring-accent hover:-translate-y-px hover:shadow-md",
      )}
    >
      <PodCover cover={art} className="h-16 shrink-0" />

      <div className="relative flex flex-1 flex-col p-4 pt-0">
        <span
          className={cn(
            "relative -mt-6 mb-3 grid size-12 w-12 place-items-center rounded-[14px] border-4 border-surface font-heading text-small font-medium",
            tile ? "text-white" : "bg-surface-muted text-ink-muted",
          )}
          style={tile ? { background: tile } : undefined}
        >
          {initials(group.name)}
          {unread ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface bg-accent"
            />
          ) : null}
        </span>

        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/groups/${group.id}`}
            className="font-heading text-h3 font-medium break-words outline-none after:absolute after:inset-0 after:rounded-card"
          >
            {group.name}
            {verified ? (
              <>
                {" "}
                <VerifiedMark />
              </>
            ) : null}
            {unread ? <span className="sr-only">, new messages</span> : null}
          </Link>
          {paid ? <PaidMark /> : null}
          {group.visibility === "PRIVATE" ? (
            <Badge tone="outline">
              <Lock aria-hidden /> private
            </Badge>
          ) : null}
          {role && role !== "MEMBER" ? (
            <Badge tone="accent">{ROLE_LABELS[role]}</Badge>
          ) : null}
        </span>

        {facts.length > 0 ? (
          <span className="mt-0.5 text-small text-ink-muted">
            {facts.join(" · ")}
          </span>
        ) : null}

        {group.description ? (
          <span className="mt-1.5 line-clamp-2 text-small text-ink-muted">
            {group.description}
          </span>
        ) : null}

        <span className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <Faces members={group.members ?? []} total={group._count.members} />
          {action ? (
            <span className="relative z-10 shrink-0">{action}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
