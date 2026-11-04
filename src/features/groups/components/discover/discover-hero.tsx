import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { cn } from "@/lib/utils/cn";

/**
 * The banner at the top of Discover, as Discord's "Find your community": the squads'
 * own cover art (blurple), dimmed so the white type reads, with the title on it.
 */
export function DiscoverHero({
  title,
  detail,
  children,
  className,
}: {
  title: string;
  detail: string;
  /** Under the words: the search on phones. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-card md:rounded-none",
        className,
      )}
    >
      <PodCover
        cover={{ kind: "gradient", preset: "blurple" }}
        className="absolute inset-0 -z-10"
      />
      <span aria-hidden className="absolute inset-0 -z-10 bg-black/30" />
      <div className="mx-auto flex max-w-content flex-col gap-4 px-5 py-10 md:px-8 md:py-16">
        <div className="flex max-w-xl flex-col gap-2">
          <h1 className="font-heading text-display font-semibold text-white">
            {title}
          </h1>
          <p className="text-body text-white/85">{detail}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
