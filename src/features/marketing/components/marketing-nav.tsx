"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { landingSections } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

type MarketingNavProps = { signedIn: boolean };

/** Section links point at the landing page, so they work from /about too. */
const sectionHref = (id: string) => `/#${id}`;

function AuthActions({
  signedIn,
  stacked = false,
}: MarketingNavProps & { stacked?: boolean }) {
  const width = stacked ? "w-full" : undefined;
  if (signedIn) {
    return (
      <Button
        asChild
        variant="primary"
        size={stacked ? "lg" : "md"}
        className={width}
      >
        <Link href="/today">Go to dashboard</Link>
      </Button>
    );
  }
  return (
    <>
      <Button
        asChild
        variant="ghost"
        size={stacked ? "lg" : "md"}
        className={width}
      >
        <Link href="/login">Log in</Link>
      </Button>
      <Button
        asChild
        variant="primary"
        size={stacked ? "lg" : "md"}
        className={width}
      >
        <Link href="/register?next=/onboarding">Sign up</Link>
      </Button>
    </>
  );
}

export function MarketingNav({ signedIn }: MarketingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // The open sheet locks page scroll, so a tapped section is scrolled to after it closes.
  const pendingSection = useRef<string | null>(null);

  function goToSection(event: React.MouseEvent, id: string) {
    setMenuOpen(false);
    if (pathname !== "/") return; // let the link navigate to /#id
    event.preventDefault();
    pendingSection.current = id;
  }

  function scrollToPending(event: Event) {
    const id = pendingSection.current;
    if (!id) return;
    event.preventDefault(); // don't pull focus back to the menu button
    pendingSection.current = null;
    history.pushState(null, "", `#${id}`);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-smooth-scroll
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-[200ms]",
        scrolled
          ? "border-border bg-bg/80 backdrop-blur-md"
          : "border-transparent bg-bg",
      )}
    >
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 md:px-8">
        <Link href="/" aria-label="Study planner home" className="shrink-0">
          <Logo />
        </Link>

        <nav
          aria-label="Sections"
          className="mx-auto hidden items-center gap-1 lg:flex"
        >
          {landingSections.map((section) => (
            <a
              key={section.id}
              href={sectionHref(section.id)}
              className="rounded-control px-3 py-2 text-body font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:ml-0 lg:flex">
          <ThemeToggle />
          <AuthActions signedIn={signedIn} />
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="ml-auto lg:hidden"
            >
              <Menu aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex h-dvh w-full max-w-sm flex-col gap-6"
            onCloseAutoFocus={scrollToPending}
          >
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Sections of the page and account links
            </SheetDescription>
            <nav aria-label="Sections" className="flex flex-col">
              {landingSections.map((section) => (
                <a
                  key={section.id}
                  href={sectionHref(section.id)}
                  onClick={(event) => goToSection(event, section.id)}
                  className="flex h-12 items-center border-b border-border text-h3 font-medium text-ink"
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-small text-ink-muted">Theme</span>
                <ThemeToggle />
              </div>
              <AuthActions signedIn={signedIn} stacked />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
