"use client";

import { MotionConfig } from "motion/react";
import { useState } from "react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/toast";

import { GalleryControls } from "./gallery-controls";
import { GalleryDisplay } from "./gallery-display";
import { GalleryOverlays } from "./gallery-overlays";
import { Interactions } from "./interactions";
import { Tokens } from "./tokens";

function ThemePanel({ theme }: { theme: "light" | "dark" }) {
  return (
    <section
      data-theme={theme}
      aria-label={`${theme} theme panel`}
      className="flex min-w-0 flex-col gap-10 rounded-card border border-border bg-bg p-5 text-ink md:p-8"
    >
      <p className="text-micro text-ink-subtle uppercase">{theme} theme</p>
      <Tokens />
      <Interactions />
      <GalleryControls />
      <GalleryDisplay />
      <GalleryOverlays />
    </section>
  );
}

export function Showcase() {
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>Design system</h1>
            <p className="text-ink-muted">
              Every primitive and micro-interaction, in both themes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-small text-ink-muted">
              <Switch
                checked={reduceMotion}
                onCheckedChange={setReduceMotion}
                aria-label="Reduce motion"
              />
              Reduce motion
            </label>
            <ThemeToggle />
          </div>
        </header>
        <p className="text-small text-ink-subtle">
          Dialogs, sheets, menus, toasts and the command palette open in a
          portal, so they follow the page theme (top right) rather than the
          panel they were opened from.
        </p>
        <div
          data-reduce-motion={reduceMotion}
          className="grid gap-6 xl:grid-cols-2"
        >
          <ThemePanel theme="light" />
          <ThemePanel theme="dark" />
        </div>
      </div>
      <Toaster />
    </MotionConfig>
  );
}
