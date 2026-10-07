import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { PodCover as Cover } from "@/lib/pods/covers";

import { cn } from "@/lib/utils/cn";

import { PodCover, type PlaceholderCover } from "./pod-cover";

type PodTileProps = {
  href: string;
  title: string;
  subtitle?: string;
  /** A short tag on the cover, e.g. "Exam" or "Your pod". */
  tag: string;
  cover: Cover | PlaceholderCover;
  /** The focal number (or a short word) at the bottom left, and the words after it. */
  stat: { value: number | string; unit: string };
  /** A smaller fact at the bottom right. */
  aside?: ReactNode;
  /** 0-100: a hairline under the stats. */
  progress?: number;
};

/**
 * A pod as a folder: cover art on top, and a body whose tab rises into the cover, with
 * the name on the tab and the numbers at the foot. The whole card is one link.
 */
export function PodTile({
  href,
  title,
  subtitle,
  tag,
  cover,
  stat,
  aside,
  progress,
}: PodTileProps) {
  return (
    <Link
      href={href}
      className="group relative isolate flex min-h-60 w-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
    >
      <PodCover
        cover={cover}
        className="absolute inset-x-0 top-0 -z-10 h-32 transition-transform duration-[300ms] group-hover:scale-[1.03]"
      />
      <span
        className={cn(
          "absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-small font-medium backdrop-blur-sm",
          // White on a dark wash over art; ink on surface over the pale placeholder.
          cover.kind === "placeholder"
            ? "border border-border bg-surface/90 text-ink"
            : "bg-black/30 text-white",
        )}
      >
        {tag}
      </span>

      <span className="relative mt-20 flex flex-1 flex-col">
        {/* The folder shape: a tab on the left that slopes down into the body. */}
        <span aria-hidden className="flex h-6 text-surface">
          <span className="w-[66%] rounded-tl-card bg-current" />
          <svg
            viewBox="0 0 40 24"
            preserveAspectRatio="none"
            className="-ml-px h-6 w-10 shrink-0"
          >
            <path d="M0 0C22 0 18 24 40 24H0Z" fill="currentColor" />
          </svg>
        </span>
        <span className="-mt-px flex flex-1 flex-col gap-5 rounded-tr-card bg-surface px-4 pb-4">
          <span className="-mt-5 flex flex-col">
            <span className="line-clamp-2 font-heading text-h3 font-medium break-words text-ink">
              {/* Keeps only the first line on the tab, clear of the cover; the rest of
                  the name gets the card's full width. */}
              <span aria-hidden className="float-right h-5 w-[30%]" />
              {title}
            </span>
            {subtitle ? (
              <span className="truncate text-small text-ink-muted">
                {subtitle}
              </span>
            ) : null}
          </span>
          <span className="mt-auto flex flex-col gap-2">
            <span className="flex items-end justify-between gap-3">
              <span className="flex min-w-0 items-end gap-2">
                <span className="font-heading text-display font-semibold text-ink tabular-nums">
                  {typeof stat.value === "number" &&
                  stat.value > 0 &&
                  stat.value < 10
                    ? `0${stat.value}`
                    : stat.value}
                </span>
                <span className="line-clamp-2 w-24 shrink-0 pb-1 text-small leading-4 text-ink-muted">
                  {" "}
                  {stat.unit}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 pb-1.5 text-small font-medium text-ink">
                {aside}
                <ChevronRight
                  className="size-4 text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </span>
            {progress === undefined ? null : (
              <span
                aria-hidden
                className="h-1 overflow-hidden rounded-full bg-surface-muted"
              >
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </span>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}
