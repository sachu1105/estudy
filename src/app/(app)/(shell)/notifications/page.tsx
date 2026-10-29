import { Bell } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { requireUser } from "@/server/auth/session";
import { notificationService } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notifications" };

const TEXT = {
  MENTION: "mentioned you in",
  REPLY: "replied to",
  ACCEPTED: "accepted your answer to",
  GROUP_TEST: "shared a test:",
  // Never names the reporter: the actor is left empty, so it reads "Someone reported".
  REPORT: "reported",
} as const;

/** Mentions, replies, accepted answers, new group tests, and reports for squad staff. */
export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await notificationService.list(user);
  const now = systemClock.now();
  return (
    <>
      <PageHeader title="Notifications" />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing new"
          description="Mentions, replies to your posts and tests shared in your squads show up here."
        />
      ) : (
        <NotificationList
          items={items.map((n) => ({
            id: n.id,
            text: `${n.actor?.displayName ?? "Someone"} ${TEXT[n.kind]}`,
            subject: n.subject,
            href: n.href,
            when: timeAgo(n.createdAt, now, user.timezone),
            unread: !n.readAt,
            actor: n.actor,
            report: n.kind === "REPORT",
          }))}
        />
      )}
    </>
  );
}
