"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

import { isActive, primaryNav, secondaryNav } from "./nav-items";

const tabClasses =
  "flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-micro font-medium transition-colors duration-[120ms]";

export function BottomTabs() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = primaryNav.filter((item) => item.mobileTab);
  const more = [
    ...primaryNav.filter((item) => !item.mobileTab),
    ...secondaryNav,
  ];
  const moreActive = more.some((item) =>
    isActive(pathname, item.href, item.also),
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((item) => {
        const active = isActive(pathname, item.href, item.also);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              tabClasses,
              active ? "text-accent" : "text-ink-muted",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger
          className={cn(
            tabClasses,
            moreActive ? "text-accent" : "text-ink-muted",
          )}
        >
          <Ellipsis className="size-5" aria-hidden />
          More
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetTitle>More</SheetTitle>
          <SheetDescription className="sr-only">
            Other sections of the app
          </SheetDescription>
          <div className="grid grid-cols-3 gap-2">
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={
                  isActive(pathname, item.href, item.also) ? "page" : undefined
                }
                className="flex flex-col items-center gap-2 rounded-control border border-border p-4 text-small font-medium text-ink aria-[current=page]:border-transparent aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-ink"
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
