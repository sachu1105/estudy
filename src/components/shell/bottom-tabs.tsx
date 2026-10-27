"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

import { isActive, primaryNav } from "./nav-items";
import type { Viewer } from "./top-bar";

const tabClasses =
  "flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-micro font-medium transition-colors duration-[120ms]";

/**
 * The tab bar under 768px. The last tab is the viewer's profile, which opens straight
 * onto settings (profile first, Log out at the foot), as the avatar's menu does in the
 * top bar from 768px.
 */
export function BottomTabs({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  const tabs = primaryNav.filter((item) => item.mobileTab);
  const profileActive = isActive(pathname, "/settings");

  return (
    <nav
      aria-label="Main"
      data-bottom-tabs
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

      <Link
        href="/settings"
        aria-current={profileActive ? "page" : undefined}
        className={cn(
          tabClasses,
          profileActive ? "text-accent" : "text-ink-muted",
        )}
      >
        {/* Decorative here: the tab is named by its label, not the initials. It
            takes an icon's 20px of height, so every label sits on one line. */}
        <span aria-hidden className="-my-1 flex">
          <Avatar
            name={viewer.name}
            src={viewer.avatarUrl}
            size="sm"
            className={cn(profileActive && "ring-2 ring-accent")}
          />
        </span>
        Profile
      </Link>
    </nav>
  );
}
