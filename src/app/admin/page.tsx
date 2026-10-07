import {
  AlertTriangle,
  BookOpenCheck,
  Bot,
  CalendarCheck,
  Clock,
  Inbox,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/blocks/stat-tile";
import { PageHeader } from "@/components/shell/page-header";
import { formatUsd } from "@/lib/admin/format";
import { formatMinutes } from "@/lib/plans/format";
import { adminQueues } from "@/server/queue";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const admin = await requireAdmin("dashboard");
  const stats = await adminService.dashboard();
  const reviews = (
    <Link
      href="/admin/catalogue"
      className="block rounded-card focus-visible:outline-2 focus-visible:outline-accent"
    >
      <StatTile
        label="Waiting for review"
        icon={Inbox}
        value={stats.pendingReviews}
        hint="Catalogue syllabuses (rule 5)"
        className="h-full hover:shadow-md"
      />
    </Link>
  );
  // Moderators see moderation only.
  if (admin.role === "MODERATOR")
    return (
      <>
        <PageHeader title="Dashboard" description="What needs a look." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews}
        </div>
      </>
    );

  const queues = await adminQueues.overview().catch(() => []);
  const waiting = queues.reduce(
    (n, q) => n + (q.counts.waiting ?? 0) + (q.counts.active ?? 0),
    0,
  );
  const failed = queues.reduce((n, q) => n + (q.counts.failed ?? 0), 0);
  const workers = queues.reduce((n, q) => n + q.workers, 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Today, in India time." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active today"
          icon={Users}
          numeral="mono"
          value={stats.activeToday}
          hint={`${stats.users} users in all`}
        />
        <StatTile
          label="Signups"
          icon={UserPlus}
          numeral="mono"
          value={stats.signupsToday}
          hint={`${stats.signups7} in the last 7 days`}
        />
        <StatTile
          label="Study sessions"
          icon={Clock}
          numeral="mono"
          value={stats.sessionsToday}
          hint={`${formatMinutes(stats.minutesToday)} studied today`}
        />
        <StatTile
          label="Active plans"
          icon={CalendarCheck}
          numeral="mono"
          value={stats.activePlans}
        />
        {reviews}
        <StatTile
          label="AI cost today"
          icon={Bot}
          numeral="mono"
          value={formatUsd(stats.aiToday.micros)}
          hint={`${stats.aiToday.calls} calls · ${formatUsd(stats.aiMonth.micros)} this month`}
        />
        <Link
          href="/admin/jobs"
          className="block rounded-card focus-visible:outline-2 focus-visible:outline-accent"
        >
          <StatTile
            label="Queues"
            icon={BookOpenCheck}
            numeral="mono"
            value={waiting}
            hint={
              workers > 0
                ? `${workers} worker${workers === 1 ? "" : "s"} running`
                : "No worker running"
            }
            className="h-full hover:shadow-md"
          />
        </Link>
        <Link
          href="/admin/jobs"
          className="block rounded-card focus-visible:outline-2 focus-visible:outline-accent"
        >
          <StatTile
            label="Failed jobs"
            icon={AlertTriangle}
            numeral="mono"
            value={failed}
            hint={`${stats.failedParsesToday} syllabus reads failed today`}
            className="h-full hover:shadow-md"
          />
        </Link>
      </div>
    </>
  );
}
