"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

/** A group's sections. Links, so each section has its own URL. */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;
  const tabs = [
    { href: base, label: "Material" },
    { href: `${base}/tests`, label: "Tests" },
    { href: `${base}/rank`, label: "Rank" },
    { href: `${base}/members`, label: "Members" },
  ];
  return (
    <nav
      aria-label="Group"
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-body font-medium",
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
