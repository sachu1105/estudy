import {
  BookOpen,
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
};

export const primaryNav: NavItem[] = [
  { href: "/today", label: "Today", icon: CalendarCheck, mobileTab: true },
  { href: "/plan", label: "Plan", icon: ListChecks, mobileTab: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/tests", label: "Tests", icon: ClipboardCheck, mobileTab: true },
  { href: "/groups", label: "Groups", icon: Users, mobileTab: true },
  { href: "/rank", label: "Rank", icon: Trophy },
  { href: "/progress", label: "Progress", icon: ChartLine },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
