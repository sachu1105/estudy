"use client";

import { Compass, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { Tooltip } from "@/components/ui/tooltip";
import { squadCover } from "@/lib/squads/cover";
import { cn } from "@/lib/utils/cn";

import { CreateGroupDialog } from "../create-group-dialog";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? words[0]![0]! + words[1]![0]!
      : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const tile = (active: boolean) =>
  cn(
    "relative grid size-12 place-items-center overflow-hidden font-heading text-small font-medium transition-[border-radius] duration-[200ms]",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
    active ? "rounded-xl" : "rounded-3xl hover:rounded-xl",
  );

/** The bar left of an active tile, as in Discord: tall for open, a dot for new messages. */
function Marker({ active, unread }: { active: boolean; unread?: boolean }) {
  return active || unread ? (
    <span
      aria-hidden
      className={cn(
        "absolute top-1/2 -left-3 w-1 -translate-y-1/2 rounded-r-full bg-ink",
        active ? "h-8" : "h-2",
      )}
    />
  ) : null;
}

/**
 * The squads you're in, one tile each, to jump between them, then making a squad and
 * finding one, as in Discord. Always there from md; on a phone only on a squad's own
 * page, beside its channel list.
 */
export function SquadRail({
  squads,
  exams,
  atLimit,
  canCreate = true,
  canPrice = false,
}: {
  squads: { id: string; name: string; cover?: unknown; unread?: boolean }[];
  /** For the new squad's exam. */
  exams: { id: string; name: string }[];
  /** Shown in place of the form once someone has made every squad their plan allows. */
  atLimit?: ReactNode;
  /** Off where the page beside it has its own way to make a squad (the welcome). */
  canCreate?: boolean;
  /** The new squad may be a paid one. */
  canPrice?: boolean;
}) {
  const pathname = usePathname();
  const squadHome = /^\/groups\/[0-9a-f-]{36}$/.test(pathname);
  const discovering = pathname.startsWith("/groups/discover");
  return (
    <nav
      aria-label="Your squads"
      className={cn(
        "w-[72px] shrink-0 [scrollbar-width:none] flex-col items-center gap-2 overflow-y-auto py-3 md:flex md:border-r md:border-border",
        // A phone: held in place while the channel list scrolls, clear of the tab bar.
        "sticky top-0 h-dvh self-start pb-20 md:static md:h-auto md:self-auto md:pb-3",
        squadHome ? "flex" : "hidden",
      )}
    >
      {squads.map((s) => {
        const active =
          pathname === `/groups/${s.id}` ||
          pathname.startsWith(`/groups/${s.id}/`);
        return (
          // The tile clips its art, so the active marker sits outside it.
          <span
            key={s.id}
            className="relative grid shrink-0 place-items-center"
          >
            <Marker active={active} unread={s.unread} />
            <Tooltip content={s.name} side="right">
              <Link
                href={`/groups/${s.id}`}
                aria-label={s.name}
                aria-current={active ? "page" : undefined}
                className={cn(tile(active), "isolate")}
              >
                {s.unread && !active ? (
                  <span className="sr-only">, new messages</span>
                ) : null}
                {/* The squad's banner is its face here too. */}
                <PodCover
                  cover={squadCover(s)}
                  className="absolute inset-0 -z-10"
                />
                <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                  {initials(s.name)}
                </span>
              </Link>
            </Tooltip>
          </span>
        );
      })}
      {squads.length ? (
        <span aria-hidden className="h-px w-8 shrink-0 bg-border" />
      ) : null}
      {canCreate ? (
        <Tooltip content="Create a squad" side="right">
          <span className="grid shrink-0 place-items-center">
            <CreateGroupDialog
              exams={exams}
              atLimit={atLimit}
              canPrice={canPrice}
              trigger={
                <button
                  type="button"
                  aria-label="Create squad"
                  className={cn(
                    tile(false),
                    "cursor-pointer bg-surface-muted text-ink-muted hover:bg-accent hover:text-on-accent",
                  )}
                >
                  <Plus className="size-5" aria-hidden />
                </button>
              }
            />
          </span>
        </Tooltip>
      ) : null}
      <span className="relative grid shrink-0 place-items-center">
        <Marker active={discovering} />
        <Tooltip content="Find a squad" side="right">
          <Link
            href="/groups/discover"
            aria-label="Find a squad"
            aria-current={discovering ? "page" : undefined}
            className={cn(
              tile(discovering),
              discovering
                ? "bg-accent text-on-accent"
                : "bg-surface-muted text-ink-muted hover:bg-accent hover:text-on-accent",
            )}
          >
            <Compass className="size-5" aria-hidden />
          </Link>
        </Tooltip>
      </span>
    </nav>
  );
}
