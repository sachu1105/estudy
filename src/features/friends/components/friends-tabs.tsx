import { Users } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

import { CountPill } from "./dm-list";

export const FRIEND_TABS = [
  "messages",
  "studying",
  "all",
  "pending",
  "add",
] as const;
export type FriendTab = (typeof FRIEND_TABS)[number];

/**
 * The bar over Friends, as Discord's: the title, then Studying, All, Pending and Add
 * friend. Phones also get Messages first (md+ has the chats in the column), and open on
 * it; md+ opens on All.
 */
export function FriendsTabs({
  tab,
  pending,
}: {
  /** Null: the default for the screen size. */
  tab: FriendTab | null;
  pending: number;
}) {
  const link = (
    key: FriendTab,
    label: string,
    on: "yes" | "no" | "md",
    extra?: string,
  ) => (
    <Link
      key={key}
      href={`/groups/friends?tab=${key}`}
      aria-current={on === "yes" ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-chip px-3 text-body font-medium whitespace-nowrap transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none max-md:h-11",
        key === "add"
          ? "bg-accent-soft text-accent-ink hover:bg-accent-soft"
          : on === "yes"
            ? "bg-surface-muted text-ink"
            : on === "md"
              ? "text-ink-muted hover:bg-surface-muted hover:text-ink md:bg-surface-muted md:text-ink"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink",
        key === "add" && on === "yes" && "ring-1 ring-accent/40",
        extra,
      )}
    >
      {label}
      {key === "pending" ? <CountPill n={pending} label="waiting" /> : null}
    </Link>
  );
  const is = (key: FriendTab) => (tab === key ? "yes" : "no");
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-1 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur md:h-14 md:flex-row md:items-center md:gap-4 md:px-6 md:py-0">
      <h1 className="flex shrink-0 items-center gap-2 text-h2 md:text-h3">
        <Users className="size-5 text-ink-muted" aria-hidden /> Friends
      </h1>
      <span aria-hidden className="hidden h-6 w-px bg-border md:block" />
      <nav
        aria-label="Friends"
        className="-mx-1 flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto px-1"
      >
        {link(
          "messages",
          "Messages",
          tab === null || tab === "messages" ? "yes" : "no",
          "md:hidden",
        )}
        {link("studying", "Studying", is("studying"))}
        {link("all", "All", tab === null ? "md" : is("all"))}
        {link("pending", "Pending", is("pending"))}
        {link("add", "Add friend", is("add"))}
      </nav>
    </div>
  );
}
