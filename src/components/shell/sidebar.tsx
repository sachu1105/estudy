"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

import { Logo } from "./logo";
import { isActive, primaryNav, secondaryNav, type NavItem } from "./nav-items";

// Collapsed state lives on <html data-sidebar> (set before paint by BootScript), so CSS
// alone decides the width and there is no flash or hydration mismatch.
function toggleCollapsed() {
  const root = document.documentElement;
  const collapsed = root.getAttribute("data-sidebar") !== "collapsed";
  if (collapsed) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
  try {
    localStorage.setItem("sidebar", collapsed ? "collapsed" : "expanded");
  } catch {
    // Storage blocked: the state still applies for this page view.
  }
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-control px-3 font-heading text-body font-medium transition-colors duration-[120ms]",
        "sidebar-collapsed:justify-center sidebar-collapsed:px-0",
        active
          ? "bg-accent-soft text-accent-ink"
          : "text-ink-muted hover:bg-surface-muted hover:text-ink",
      )}
    >
      <item.icon className="size-[18px] shrink-0" aria-hidden />
      <span className="truncate sidebar-collapsed:sr-only">{item.label}</span>
    </Link>
  );
  return (
    <Tooltip
      content={item.label}
      side="right"
      className="hidden sidebar-collapsed:block"
    >
      {link}
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex",
        "transition-[width] duration-[200ms] ease-out sidebar-collapsed:w-[72px]",
      )}
    >
      <Link
        href="/today"
        className="mb-6 flex h-10 items-center px-1.5 sidebar-collapsed:justify-center"
      >
        <Logo className="sidebar-collapsed:hidden" />
        <Logo showName={false} className="hidden sidebar-collapsed:flex" />
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {primaryNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        {secondaryNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-body text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <PanelLeftClose
            className="size-[18px] sidebar-collapsed:hidden"
            aria-hidden
          />
          <PanelLeftOpen
            className="hidden size-[18px] sidebar-collapsed:block"
            aria-hidden
          />
          <span className="sidebar-collapsed:sr-only">Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );
}
