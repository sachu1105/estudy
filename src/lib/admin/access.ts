// Who sees which part of the admin panel (milestone 15). Pure, shared by the navigation
// and the server guard; the server is the one that enforces it (rule 9).

export const ADMIN_AREAS = {
  dashboard: { label: "Dashboard", href: "/admin" },
  catalogue: { label: "Catalogue", href: "/admin/catalogue" },
  users: { label: "Users", href: "/admin/users" },
  settings: { label: "Site", href: "/admin/settings" },
  plans: { label: "Plans and limits", href: "/admin/plans" },
  jobs: { label: "Jobs and AI", href: "/admin/jobs" },
  audit: { label: "Audit log", href: "/admin/audit" },
} as const;

/** "exams": adding exams and promoting uploads; reviewing is moderation. */
export type AdminArea = keyof typeof ADMIN_AREAS | "roles" | "exams";
type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

// MODERATOR: moderation only. ADMIN: everything except roles and billing.
// SUPER_ADMIN: everything.
const ACCESS: Record<Role, readonly AdminArea[]> = {
  USER: [],
  MODERATOR: ["dashboard", "catalogue"],
  ADMIN: [
    "dashboard",
    "catalogue",
    "exams",
    "users",
    "settings",
    "jobs",
    "audit",
  ],
  SUPER_ADMIN: [
    "dashboard",
    "catalogue",
    "exams",
    "users",
    "settings",
    "plans",
    "jobs",
    "audit",
    "roles",
  ],
};

export function canAdmin(role: Role, area: AdminArea) {
  return ACCESS[role].includes(area);
}

export function adminNav(role: Role) {
  return (Object.keys(ADMIN_AREAS) as (keyof typeof ADMIN_AREAS)[])
    .filter((area) => canAdmin(role, area))
    .map((area) => ({ area, ...ADMIN_AREAS[area] }));
}
