import { Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { squadCover } from "@/lib/squads/cover";
import { cn } from "@/lib/utils/cn";

import { GroupMenu } from "../group-menu";

type Facts = { exam?: { name: string } | null; _count: { members: number } };

/** "LDC 2026 · 12 members": the exam it's for and who's in it. */
export function squadFacts(group: Facts) {
  const n = group._count.members;
  return [group.exam?.name, `${n} member${n === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The top of a squad's channel list, as in Discord: its banner, its name over the art
 * (which opens the squad menu), a way to invite for admins, and who's in it.
 */
export function SquadBanner({
  group,
  menu,
  canInvite,
  heading: Heading = "p",
  className,
}: {
  group: Facts & {
    id: string;
    name: string;
    cover?: unknown;
    visibility: string;
  };
  menu: Omit<ComponentProps<typeof GroupMenu>, "asName" | "groupId" | "name">;
  canInvite: boolean;
  /** An h1 where the squad's page is the channel list (phones). */
  heading?: "h1" | "p";
  className?: string;
}) {
  return (
    <div
      className={cn("relative isolate h-32 shrink-0 overflow-hidden", className)}
    >
      <PodCover cover={squadCover(group)} className="absolute inset-0 -z-10" />
      {/* A flat dim, so white type reads on any banner, light ones too. */}
      <span aria-hidden className="absolute inset-0 -z-10 bg-black/15" />
      <div className="flex items-start gap-1 p-2">
        {/* Named for the squad, not for the menu button inside it. */}
        <Heading
          aria-label={Heading === "h1" ? group.name : undefined}
          className="flex min-w-0 flex-1"
        >
          <GroupMenu groupId={group.id} name={group.name} asName {...menu} />
        </Heading>
        {canInvite ? (
          <Link
            href={`/groups/${group.id}/members`}
            aria-label="Invite people"
            className="grid size-11 shrink-0 place-items-center rounded-control text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)] transition-colors duration-[120ms] hover:bg-black/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <UserPlus className="size-5" aria-hidden />
          </Link>
        ) : null}
      </div>
      <p className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-0.5 text-small text-white backdrop-blur-sm">
        {group.visibility === "PRIVATE" ? (
          <>
            <Lock className="size-3.5 shrink-0" aria-hidden />
            <span className="sr-only">Private · </span>
          </>
        ) : null}
        <span className="truncate">{squadFacts(group)}</span>
      </p>
    </div>
  );
}
