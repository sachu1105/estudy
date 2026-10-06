import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/features/pods/components/back-link";
import { UserActions } from "@/features/admin/components/user-actions";
import { canAdmin } from "@/lib/admin/access";
import { formatWhen } from "@/lib/admin/format";
import { isId } from "@/lib/ids";
import { formatMinutes } from "@/lib/plans/format";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "User · Admin" };

export default async function AdminUser({
  params,
}: PageProps<"/admin/users/[userId]">) {
  const admin = await requireAdmin("users");
  const { userId } = await params;
  const user = isId(userId) ? await adminService.user(userId) : null;
  if (!user) notFound();
  const current = user.subscriptions.find((s) => s.status !== "EXPIRED");
  const facts: [string, string][] = [
    ["Name", `${user.name} (${user.displayName})`],
    ["Joined", formatWhen(user.createdAt)],
    [
      "Email verified",
      user.emailVerifiedAt ? formatWhen(user.emailVerifiedAt) : "No",
    ],
    [
      "Plan",
      current
        ? `${current.plan.toLowerCase()} · ${current.source.toLowerCase().replace("_", " ")}${current.periodEnd ? ` · until ${formatWhen(current.periodEnd)}` : ""}`
        : "free",
    ],
    ["Timezone", user.timezone],
    ["Last sign-in", formatWhen(user.activity.lastLogin)],
    ["Last study", formatWhen(user.activity.lastSession)],
    ["Time studied", formatMinutes(user.activity.minutes)],
    ["XP", String(user.activity.xp)],
    ["Active plans", user.studyPlans.map((p) => p.title).join(", ") || "None"],
    [
      "Pods and material",
      `${user._count.pods} pods, ${user._count.podItems} items, ${user._count.syllabusVersions} syllabuses`,
    ],
    [
      "Streak reset",
      user.streakResetAt ? formatWhen(user.streakResetAt) : "Never",
    ],
  ];
  const editable =
    user.id !== admin.id &&
    (user.role !== "SUPER_ADMIN" || admin.role === "SUPER_ADMIN");

  return (
    <>
      <BackLink href="/admin/users" label="Users" />
      <PageHeader title={user.email} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={user.role === "USER" ? "outline" : "accent"}>
          {user.role.replace("_", " ").toLowerCase()}
        </Badge>
        <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>
          {user.status.toLowerCase()}
        </Badge>
        {user.beginnerMode ? <Badge>new to PSC</Badge> : null}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <dl className="divide-y divide-border self-start rounded-card border border-border bg-surface">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4"
            >
              <dt className="text-small text-ink-muted sm:w-36 sm:shrink-0">
                {label}
              </dt>
              <dd className="min-w-0 text-body break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-8">
          {editable ? (
            <UserActions
              userId={user.id}
              status={user.status}
              role={user.role}
              plan={current?.plan ?? "FREE"}
              canRoles={canAdmin(admin.role, "roles")}
            />
          ) : (
            <p className="text-body text-ink-muted">
              {user.id === admin.id
                ? "This is your account; another admin changes it."
                : "Only a super admin changes a super admin."}
            </p>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="text-h3">Recent activity in the audit log</h2>
            {user.activity.recent.length === 0 ? (
              <p className="text-small text-ink-muted">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-small">
                {user.activity.recent.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span className="font-mono">{e.action}</span>
                    <span className="shrink-0 text-ink-muted">
                      {formatWhen(e.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
