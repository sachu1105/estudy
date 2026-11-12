import { timeAgo } from "@/lib/format/ago";
import type { NotificationService } from "@/server/services/notifications/notification-service";

export type NotificationView = {
  id: string;
  text: string;
  subject: string;
  href: string;
  when: string;
  unread: boolean;
  actor: { displayName: string; avatarUrl: string | null } | null;
  /** A report for a squad's staff: nobody is named, so a flag stands in for a face. */
  report?: boolean;
};

type Row = Awaited<ReturnType<NotificationService["list"]>>[number];

const TEXT = {
  MENTION: "mentioned you in",
  REPLY: "replied to",
  ACCEPTED: "accepted your answer to",
  GROUP_TEST: "shared a test:",
  // Never names the reporter: the actor is left empty, so it reads "Someone reported".
  REPORT: "reported",
  FRIEND_REQUEST: "sent you a friend request",
  FRIEND_ACCEPTED: "accepted your friend request",
  EXAM_DATE: "",
  STORE_LISTING: "",
} as const;

/** One stored notification as the inbox shows it, for the bell's menu and the page. */
export function toView(n: Row, now: Date, timeZone: string): NotificationView {
  return {
    id: n.id,
    // An exam date reminder or a Store review has no one named behind it: it just says
    // what happened.
    text:
      n.kind === "EXAM_DATE"
        ? "Exam dates"
        : n.kind === "STORE_LISTING"
          ? "Your Store listing:"
          : `${n.actor?.displayName ?? "Someone"} ${TEXT[n.kind]}`,
    subject: n.subject,
    href: n.href,
    when: timeAgo(n.createdAt, now, timeZone),
    unread: !n.readAt,
    actor: n.actor
      ? { displayName: n.actor.displayName, avatarUrl: n.actor.avatarUrl }
      : null,
    report: n.kind === "REPORT",
  };
}
