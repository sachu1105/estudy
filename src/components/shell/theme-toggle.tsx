"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setThemePreference, useThemePreference } from "@/lib/theme";

// One button: shows the theme it switches to.
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useThemePreference() === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setThemePreference(dark ? "light" : "dark")}
      className={className}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
