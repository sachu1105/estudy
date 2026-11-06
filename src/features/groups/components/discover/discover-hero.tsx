import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import type { CoverPreset } from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

/**
 * The banner at the top of Discover, as Discord's "Find your community": the squads'
 * own cover art (blurple), dimmed so the white type reads, with the title on it. The
 * Store wears it in its own colour, edge to edge on every screen.
 */
export function DiscoverHero({
  title,
  detail,
  children,
  preset = "blurple",
  full = false,
  art,
  className,
}: {
  title: string;
  detail: string;
  /** Under the words: the search on phones. */
  children?: ReactNode;
  preset?: CoverPreset;
  /** Edge to edge on phones too (the Store); Discover is a card on phones. */
  full?: boolean;
  /** A picture beside the words from 768px. Decorative. */
  art?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden",
        full ? "rounded-none" : "rounded-card md:rounded-none",
        className,
      )}
    >
      <PodCover
        cover={{ kind: "gradient", preset }}
        className="absolute inset-0 -z-10"
      />
      <span aria-hidden className="absolute inset-0 -z-10 bg-black/30" />
      <div
        className={cn(
          "mx-auto flex max-w-content items-center gap-8 px-5 md:px-8",
          full ? "py-12 md:py-16" : "py-14 md:py-24",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex max-w-xl flex-col gap-2">
            <h1 className="font-heading text-display font-semibold text-white">
              {title}
            </h1>
            <p className="text-body text-white/85">{detail}</p>
          </div>
          {children}
        </div>
        {art ? (
          <div aria-hidden className="hidden shrink-0 md:block">
            {art}
          </div>
        ) : null}
      </div>
    </section>
  );
}
