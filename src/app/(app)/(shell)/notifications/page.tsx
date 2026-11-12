import { Bell } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { toView } from "@/features/notifications/view";
import { systemClock } from "@/lib/clock";
import { requireUser } from "@/server/auth/session";
import { notificationService } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notifications" };

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
          description="Mentions, replies to your posts, friend requests, tests shared in your squads and reminders for exams you follow show up here."
        />
      ) : (
        <NotificationList
          items={items.map((n) => toView(n, now, user.timezone))}
        />
      )}
    </>
  );
}
