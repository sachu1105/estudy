"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/tooltip";
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
    "relative grid size-12 place-items-center font-heading text-small font-medium transition-[border-radius,background-color,color] duration-[200ms]",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
    active
      ? "rounded-xl bg-accent-soft text-accent-ink"
      : "rounded-3xl bg-surface-muted text-ink-muted hover:rounded-xl hover:text-ink",
  );

/** The squads you're in, one tile each, to jump between them (md and up). */
export function SquadRail({
  squads,
}: {
  squads: { id: string; name: string }[];
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
          className={tile(pathname === "/groups")}
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
          <Tooltip key={s.id} content={s.name} side="right">
            <Link
              href={`/groups/${s.id}`}
              aria-label={s.name}
              aria-current={active ? "page" : undefined}
              className={tile(active)}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-3 h-8 w-1 -translate-y-1/2 rounded-r-full bg-ink"
                />
              ) : null}
              {initials(s.name)}
            </Link>
          </Tooltip>
        );
      })}
    </nav>
  );
}
