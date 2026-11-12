"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils/cn";

import { INBOX_CHANGED, useInbox } from "../use-inbox";
import type { NotificationView } from "../view";
import { NotificationPanel } from "./notification-panel";

const POLL_MS = 60_000;

/**
 * The bell and its menu: a panel under it from md up, a bottom sheet on a phone. The
 * count is checked once a minute while the tab is visible, on every page change and
 * after any change to the inbox; the list loads fresh each time the menu opens.
 */
export function NotificationMenu({ initial }: { initial: number }) {
  const pathname = usePathname();
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const inbox = useInbox([], (delta) => setCount((c) => Math.max(0, c + delta)));
  const { reset } = inbox;

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
    window.addEventListener(INBOX_CHANGED, check);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener(INBOX_CHANGED, check);
    };
  }, [pathname]);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotificationView[];
        unread: number;
      };
      reset(data.items);
      setCount(data.unread);
      setLoaded(true);
    } catch {
      // Offline: whatever loaded last stays.
    }
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };
  const close = () => setOpen(false);
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return (
    <>
      <Popover open={open && wide} onOpenChange={onOpenChange}>
        <PopoverTrigger
          aria-label={label}
          className={cn(
            "relative flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink md:size-10",
            open && "bg-surface-muted text-ink",
          )}
        >
          <Bell className="size-5" aria-hidden />
          {count > 0 ? (
            <span className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-small leading-none text-on-accent tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex max-h-[min(540px,75dvh)] w-[380px] flex-col overflow-hidden"
        >
          <NotificationPanel
            title={<h2 className="text-h3">Notifications</h2>}
            inbox={inbox}
            loaded={loaded}
            close={close}
          />
        </PopoverContent>
      </Popover>
      <Sheet open={open && !wide} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          className="max-h-[80dvh] gap-0 rounded-t-[20px] p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <NotificationPanel
            title={<SheetTitle className="text-h3">Notifications</SheetTitle>}
            inbox={inbox}
            loaded={loaded}
            close={close}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
