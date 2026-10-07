"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

const POLL_MS = 60_000;

/**
 * The way into the notification centre. The count is checked once a minute while the
 * tab is visible, and on every page change; no stream for something this quiet.
 */
export function NotificationBell({ initial }: { initial: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications/unread", {
          cache: "no-store",
        });
        if (res.ok && alive)
          setCount(((await res.json()) as { count: number }).count);
      } catch {
        // Offline: keep the last count.
      }
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pathname]);

  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";
  return (
    <Link
      href="/notifications"
      aria-label={label}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink md:size-10",
        pathname === "/notifications" && "text-ink",
      )}
    >
      <Bell className="size-5" aria-hidden />
      {count > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-small leading-none text-on-accent tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
