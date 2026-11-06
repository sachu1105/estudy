import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { coverFor } from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

export type BundleTileData = {
  id: string;
  title: string;
  papers: number;
  /** How the reader came by it, or where they offer it: "Bought", "In the Store". */
  how: string;
  /** Papers in it the reader has handed in at least once; null for ones they made. */
  attempted: number | null;
  /** Just bought or added: outlined. */
  fresh?: boolean;
};

/**
 * A bundle on Tests, as a bundle: its cover, name and how the reader has it, then how
 * many of its papers they've attempted. Opens the bundle, where each paper is sat.
 */
export function BundleTile({ bundle }: { bundle: BundleTileData }) {
  const done = bundle.attempted;
  return (
    <li>
      <Link
        href={`/bundles/${bundle.id}`}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-card border bg-surface transition-transform duration-[120ms] ease-out hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          bundle.fresh ? "border-accent ring-1 ring-accent" : "border-border",
        )}
      >
        <span className="relative block h-20">
          <PodCover cover={coverFor(bundle.id)} className="absolute inset-0" />
          <span className="absolute bottom-2.5 left-3 rounded-full bg-black/35 px-2.5 py-1 text-micro text-white uppercase backdrop-blur-sm">
            {bundle.papers === 1
              ? "1 paper"
              : `Bundle · ${bundle.papers} papers`}
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1 p-4">
          <span className="line-clamp-2 font-heading text-h3 font-medium">
            {bundle.title}
          </span>
          <span className="text-small text-ink-muted">{bundle.how}</span>
          <span className="mt-auto flex flex-col gap-2 pt-3">
            <span className="flex items-center justify-between gap-3 text-small">
              <span className="text-ink-muted">
                {done === null ? (
                  "You made it"
                ) : (
                  <>
                    <span className="font-mono font-medium text-ink tabular-nums">
                      {done} of {bundle.papers}
                    </span>{" "}
                    attempted
                  </>
                )}
              </span>
              <span className="flex items-center gap-1 font-medium text-ink">
                Open
                <ChevronRight
                  className="size-4 text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </span>
            {done === null ? null : (
              <span className="block h-1 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(done / bundle.papers) * 100}%` }}
                />
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
