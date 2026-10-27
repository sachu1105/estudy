import {
  Boxes,
  CalendarCheck,
  ClipboardCheck,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the bottom tab bar under 768px. */
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
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * The avatar's menu in the top bar from 768px, less Log out. Settings is the profile
 * too, so it's one item. Moderators and admins also get the admin panel. Under 768px
 * the Profile tab opens settings, which carries the same links at its foot.
 */
export function accountNav(staff = false): NavItem[] {
  return [
    { href: "/settings", label: "Settings", icon: Settings },
    ...(staff ? [{ href: "/admin", label: "Admin panel", icon: Shield }] : []),
  ];
}

export function isActive(pathname: string, href: string, also: string[] = []) {
  return [href, ...also].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
