"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const options = [
  {
    value: "system",
    label: <Monitor aria-hidden />,
    ariaLabel: "System theme",
  },
  { value: "light", label: <Sun aria-hidden />, ariaLabel: "Light theme" },
  { value: "dark", label: <Moon aria-hidden />, ariaLabel: "Dark theme" },
] satisfies {
  value: ThemePreference;
  label: React.ReactNode;
  ariaLabel: string;
}[];

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();
  return (
    <SegmentedControl
      ariaLabel="Theme"
      size="sm"
      value={preference}
      onValueChange={setThemePreference}
      options={options}
      className={className}
    />
  );
}
