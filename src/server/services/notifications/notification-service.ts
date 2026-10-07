import type { Clock } from "@/lib/clock";
import type {
  NewNotification,
  NotificationRepository,
} from "@/server/repositories/notification-repository";
import type { Actor } from "@/server/services/syllabus/deps";

export type NotificationDeps = {
  notifications: NotificationRepository;
  clock: Clock;
};

/** Mentions, replies, accepted answers and new group tests, in one inbox. */
export function createNotificationService(deps: NotificationDeps) {
  return {
    /**
     * Sends each person one notification at most: never to the actor, never to someone
     * who blocked the actor. The first row for a person wins (callers put mentions first).
     */
    async notify(rows: NewNotification[]) {
      const seen = new Set<string>();
      const fresh = rows.filter((r) => {
        if (r.userId === r.actorId || seen.has(r.userId)) return false;
        seen.add(r.userId);
        return true;
      });
      const actorId = fresh[0]?.actorId;
      const blockers = actorId
        ? await deps.notifications.blockersOf(
            actorId,
            fresh.map((r) => r.userId),
          )
        : new Set<string>();
      await deps.notifications.createMany(
        fresh.filter((r) => !blockers.has(r.userId)),
        deps.clock.now(),
      );
    },

    /** Everyone in the group but the actor. */
    async notifyGroup(
      groupId: string,
      row: Omit<NewNotification, "userId" | "groupId">,
    ) {
      const ids = await deps.notifications.memberIds(groupId);
      await this.notify(ids.map((userId) => ({ ...row, userId, groupId })));
    },

    list: (user: Actor) => deps.notifications.list(user.id),
    unread: (user: Actor) => deps.notifications.unread(user.id),
    markRead: (user: Actor, id: string | null) =>
      deps.notifications.markRead(user.id, id, deps.clock.now()),
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
