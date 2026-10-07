import {
  Boxes,
  CalendarCheck,
  ChartLine,
  ClipboardCheck,
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
  // The study space. Each exam pod holds its subjects, its plan (week and month) and
  // its syllabus, so the plan, the calendar and syllabus editing all live in here.
  {
    href: "/pods",
    label: "Pods",
    icon: Boxes,
    mobileTab: true,
    also: ["/syllabus", "/plan", "/calendar"],
  },
  { href: "/tests", label: "Tests", icon: ClipboardCheck, mobileTab: true },
  { href: "/groups", label: "Squads", icon: Users, mobileTab: true },
  { href: "/rank", label: "Podium", icon: Trophy },
  { href: "/progress", label: "Growth", icon: ChartLine },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string, also: string[] = []) {
  return [href, ...also].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
