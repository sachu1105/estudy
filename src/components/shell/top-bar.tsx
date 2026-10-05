"use client";

import {
  LogOut,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import {
  CommandPalette,
  type CommandGroup,
} from "@/components/ui/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setThemePreference } from "@/lib/theme";

import { LogoMark } from "./logo";
import { primaryNav, secondaryNav } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

// Placeholder identity until auth lands in milestone 2.
const viewer = { name: "Aspirant", email: "you@example.com" };

export function TopBar() {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const groups: CommandGroup[] = [
    {
      heading: "Go to",
      items: [...primaryNav, ...secondaryNav].map((item) => ({
        id: item.href,
        label: item.label,
        icon: item.icon,
        onSelect: () => router.push(item.href),
      })),
    },
    {
      heading: "Theme",
      items: [
        {
          id: "theme-system",
          label: "Use system theme",
          icon: Monitor,
          onSelect: () => setThemePreference("system"),
        },
        {
          id: "theme-light",
          label: "Switch to light theme",
          icon: Sun,
          onSelect: () => setThemePreference("light"),
        },
        {
          id: "theme-dark",
          label: "Switch to dark theme",
          icon: Moon,
          onSelect: () => setThemePreference("dark"),
        },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur md:px-8">
      <Link href="/today" aria-label="Today" className="md:hidden">
        <LogoMark />
      </Link>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 max-w-sm flex-1 cursor-pointer items-center gap-2.5 rounded-control border border-border bg-surface px-3 text-body text-ink-subtle transition-colors hover:border-ink-subtle"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="hidden rounded-[6px] border border-border px-1.5 font-mono text-micro text-ink-muted sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle className="hidden sm:inline-flex" />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="cursor-pointer rounded-full"
          >
            <Avatar name={viewer.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <p className="text-body font-medium text-ink">{viewer.name}</p>
              <p className="text-small text-ink-muted">{viewer.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <User aria-hidden /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings aria-hidden /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut aria-hidden /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        groups={groups}
      />
    </header>
  );
}
