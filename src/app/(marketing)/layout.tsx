import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";

// Minimal frame. The full navbar, sections and footer are milestone 2.5.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 md:px-8">
          <Link href="/" aria-label="Study planner home">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-12 md:px-8">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-small text-ink-muted md:px-8">
          <span>© {new Date().getFullYear()} Veraft</span>
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}
