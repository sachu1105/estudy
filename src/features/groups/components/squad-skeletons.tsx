import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

// Skeletons for Squads, shaped like the screens they stand in for, so moving between
// squads, channels, Discover and Friends never flashes a blank page (design system:
// skeletons, never spinners). The rail is the layout's and stays real. Server
// components, no data.

/** A heading over a few rows, as a channel category or a list of chats. */
function Rows({ rows, avatar = false }: { rows: number; avatar?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="mt-3 mb-1 ml-2 h-3 w-20" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-10 items-center gap-3 px-2">
          <Skeleton
            className={cn(
              "shrink-0",
              avatar ? "size-8 rounded-full" : "size-5",
            )}
          />
          <Skeleton className={cn("h-4", i % 2 ? "w-28" : "w-36")} />
        </div>
      ))}
    </div>
  );
}

/** A squad's channel list: its banner, then categories of channels. */
export function ChannelListSkeleton() {
  return (
    <>
      <Skeleton className="h-36 shrink-0 rounded-none" />
      <div className="flex flex-col p-2">
        <Rows rows={1} />
        <Rows rows={2} />
        <Rows rows={2} />
      </div>
    </>
  );
}

/** A squad's home: its name, who's in it, and its channels as cards. */
export function SquadHomeSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
      </div>
    </div>
  );
}

/** A chat: a few messages, then the box at the bottom. */
export function ChatSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Skeleton className="size-5" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-5 py-6">
        {["w-3/5", "w-2/5", "w-4/5", "w-1/2", "w-2/3"].map((width, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className={cn("h-4", width)} />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-11 shrink-0 rounded-control" />
    </div>
  );
}

/**
 * The screen beside the rail while it loads (the rail itself is the layout's, and stays
 * on screen). A squad's own screen is edge to edge on phones too, as SquadShell's.
 */
export function SquadScreenSkeleton({
  screen = true,
  children,
}: {
  /** A squad's own screen: edge to edge on phones too. */
  screen?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-squad-screen={screen ? "" : undefined}
      aria-busy="true"
      aria-label="Loading"
      className="flex min-w-0 flex-1"
    >
      {children}
    </div>
  );
}

/** The column beside the rail on md+ (channels, chats). */
export function SideColumnSkeleton({
  phone = false,
  children,
}: {
  /** Shown on phones too, as the page itself (a squad's channel list). */
  phone?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "min-w-0 flex-col md:flex md:w-72 md:shrink-0 md:border-r md:border-border",
        // On a phone it's the page: a rounded panel beside the rail, as a squad's home.
        phone
          ? "flex flex-1 overflow-hidden rounded-tl-[20px] border-t border-l border-border bg-surface md:flex-none md:rounded-none md:border-t-0 md:border-l-0 md:bg-transparent"
          : "hidden",
      )}
    >
      {children}
    </div>
  );
}

export { Rows as ListRowsSkeleton };
