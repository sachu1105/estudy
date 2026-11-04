import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { VerifiedMark } from "@/components/blocks/verified-mark";
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

const count = new Intl.NumberFormat("en-IN");

/** "● 3 studying  ● 120 members": a dot and a number, as Discord's online and members. */
function Stat({
  n,
  label,
  live,
}: {
  n: number;
  label: string;
  live?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          live ? "bg-accent" : "bg-ink-subtle",
        )}
      />
      <span className="font-medium text-ink tabular-nums">
        {count.format(n)}
      </span>{" "}
      {label}
    </span>
  );
}

/**
 * A squad at a glance, shaped like a Discord Discover card: its art across the top, its
 * tile straddling the art's edge, the name and what it's about, then who's in it and
 * who's studying now. The whole card opens the squad; an action (Join) sits on top of it.
 */
export function GroupCard({
  group,
  role,
  verified = false,
  studying = 0,
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
    _count: { members: number };
    /** A paid squad's pass. Null: free. */
    pricePaise?: number | null;
    accessDays?: number | null;
  };
  role?: GroupRole | null;
  /** Run by someone on a paid plan. */
  verified?: boolean;
  /** Members with a focus timer running right now. */
  studying?: number;
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
  const members = group._count.members;

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow] duration-[120ms] focus-within:ring-2 focus-within:ring-accent hover:-translate-y-px hover:shadow-md">
      <PodCover cover={art} className="h-32 shrink-0" />

      <div className="relative flex flex-1 flex-col px-4 pb-4">
        <span
          aria-hidden
          className={cn(
            "-mt-8 mb-2 grid size-14 place-items-center rounded-[16px] border-4 border-surface font-heading text-h3 font-medium",
            tile ? "text-white" : "bg-surface-muted text-ink-muted",
          )}
          style={tile ? { background: tile } : undefined}
        >
          {initials(group.name)}
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
          <span className="text-small text-ink-muted">{facts.join(" · ")}</span>
        ) : null}

        {group.description ? (
          <span className="mt-2 line-clamp-3 text-small text-ink">
            {group.description}
          </span>
        ) : null}

        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
            {studying > 0 ? <Stat n={studying} label="studying" live /> : null}
            <Stat n={members} label={members === 1 ? "member" : "members"} />
          </span>
          {action ? (
            <span className="relative z-10 shrink-0">{action}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
