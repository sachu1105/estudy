"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PodCover } from "@/components/blocks/pod-cover";
import { Tooltip } from "@/components/ui/tooltip";
import { squadCover } from "@/lib/squads/cover";
import { cn } from "@/lib/utils/cn";

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

/** The squads you're in, one tile each, to jump between them (md and up). */
export function SquadRail({
  squads,
}: {
  squads: { id: string; name: string; cover?: unknown; unread?: boolean }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Your squads"
      className="hidden w-[72px] shrink-0 [scrollbar-width:none] flex-col items-center gap-2 overflow-y-auto border-r border-border py-3 md:flex"
    >
      <Tooltip content="All squads" side="right">
        <Link
          href="/groups"
          aria-label="All squads"
          className={cn(
            tile(pathname === "/groups"),
            pathname === "/groups"
              ? "bg-accent-soft text-accent-ink"
              : "bg-surface-muted text-ink-muted hover:text-ink",
          )}
        >
          <LayoutGrid className="size-5" aria-hidden />
        </Link>
      </Tooltip>
      <span aria-hidden className="h-px w-8 bg-border" />
      {squads.map((s) => {
        const active =
          pathname === `/groups/${s.id}` ||
          pathname.startsWith(`/groups/${s.id}/`);
        return (
          // The tile clips its art, so the active marker sits outside it.
          <span key={s.id} className="relative grid place-items-center">
            {active || s.unread ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 -left-3 w-1 -translate-y-1/2 rounded-r-full bg-ink",
                  active ? "h-8" : "h-2",
                )}
              />
            ) : null}
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
    </nav>
  );
}
