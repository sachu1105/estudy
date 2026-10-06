import {
  Boxes,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  ClipboardCheck,
  ListChecks,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the bottom tab bar under 768px; the rest live under "More". */
  mobileTab?: boolean;
  /** Other paths that belong to this item (syllabus pages live under Pods). */
  also?: string[];
};

export const primaryNav: NavItem[] = [
  { href: "/today", label: "Today", icon: CalendarCheck, mobileTab: true },
  // The study space: every subject's pod. Syllabus upload and editing live inside it.
  {
    href: "/pods",
    label: "Pods",
    icon: Boxes,
    mobileTab: true,
    also: ["/syllabus"],
  },
  { href: "/plan", label: "Plan", icon: ListChecks, mobileTab: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tests", label: "Tests", icon: ClipboardCheck, mobileTab: true },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/rank", label: "Rank", icon: Trophy },
  { href: "/progress", label: "Progress", icon: ChartLine },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string, also: string[] = []) {
  return [href, ...also].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
