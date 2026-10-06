"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string };

function Links({ items, close }: { items: Item[]; close?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-control px-3 text-body md:min-h-9",
              active
                ? "bg-accent-soft font-medium text-accent-ink"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
        return (
          <li key={item.href}>
            {close ? <SheetClose asChild>{link}</SheetClose> : link}
          </li>
        );
      })}
    </ul>
  );
}

/** Admin sections this role may use: a sidebar on desktop, a sheet on phones. */
export function AdminNav({ items }: { items: Item[] }) {
  return (
    <>
      <nav aria-label="Admin" className="hidden w-52 shrink-0 md:block">
        <Links items={items} />
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary" className="self-start md:hidden">
            <Menu aria-hidden /> Sections
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetTitle>Admin</SheetTitle>
          <nav aria-label="Admin sections">
            <Links items={items} close />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
