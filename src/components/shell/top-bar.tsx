"use client";

import {
  LogOut,
  Monitor,
  Moon,
  Search,
  Settings,
  Shield,
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

import { Logo, LogoMark } from "./logo";
import { NotificationBell } from "./notification-bell";
import { primaryNav, secondaryNav } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export type Viewer = {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Moderators and admins get a way into the admin panel. */
  staff?: boolean;
  /** Unread notifications when the page was rendered. */
  unread?: number;
};

type TopBarProps = {
  viewer: Viewer;
  /** Server action passed down by the layout, so the shell stays free of feature imports. */
  logout: () => Promise<void>;
};

export function TopBar({ viewer, logout }: TopBarProps) {
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur md:static md:border-0 md:bg-transparent md:pr-4 md:pl-0 md:backdrop-blur-none">
      <Link href="/today" aria-label="Today" className="md:hidden">
        <LogoMark />
      </Link>
      {/* As wide as the sidebar under it, so the logo sits over the nav. */}
      <Link
        href="/today"
        className="hidden h-10 w-60 shrink-0 items-center px-[18px] transition-[width] duration-[200ms] ease-out md:flex sidebar-collapsed:w-[72px] sidebar-collapsed:justify-center sidebar-collapsed:px-0"
      >
        <Logo className="sidebar-collapsed:hidden" />
        <Logo showName={false} className="hidden sidebar-collapsed:flex" />
      </Link>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 max-w-xl min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-body text-ink-muted transition-colors hover:border-ink-subtle md:mx-auto md:h-11"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">Search pods…</span>
        <kbd className="hidden rounded-[6px] border border-border px-1.5 font-mono text-micro text-ink-muted sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:ml-0">
        <ThemeToggle className="hidden sm:inline-flex" />
        <NotificationBell initial={viewer.unread ?? 0} />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="cursor-pointer rounded-full"
          >
            <Avatar name={viewer.name} src={viewer.avatarUrl} />
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
            {viewer.staff ? (
              <DropdownMenuItem onSelect={() => router.push("/admin")}>
                <Shield aria-hidden /> Admin panel
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()}>
              <LogOut aria-hidden /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette
        search={{
          label: "Search pods for",
          onSearch: (q) =>
            router.push(`/pods/search?q=${encodeURIComponent(q)}`),
        }}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        groups={groups}
      />
    </header>
  );
}
