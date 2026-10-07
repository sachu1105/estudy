import "server-only";

import { prisma } from "@/server/db";
import type { NotificationKind } from "@/server/db/generated/prisma/client";

export type NewNotification = {
  userId: string;
  actorId: string | null;
  kind: NotificationKind;
  groupId: string | null;
  href: string;
  subject: string;
};

/** The in-app notification centre (milestone 14). */
export const notificationRepository = {
  createMany(rows: NewNotification[], at: Date) {
    return rows.length
      ? prisma.notification.createMany({
          data: rows.map((r) => ({ ...r, createdAt: at })),
        })
      : Promise.resolve({ count: 0 });
  },

  /** Of these people, the ones who blocked `actorId`: they don't hear from them. */
  async blockersOf(actorId: string, userIds: string[]) {
    const rows = await prisma.block.findMany({
      where: { blockedId: actorId, blockerId: { in: userIds } },
      select: { blockerId: true },
    });
    return new Set(rows.map((r) => r.blockerId));
  },

  memberIds(groupId: string) {
    return prisma.membership
      .findMany({ where: { groupId }, select: { userId: true } })
      .then((rows) => rows.map((r) => r.userId));
  },

  list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  unread: (userId: string) =>
    prisma.notification.count({ where: { userId, readAt: null } }),

  markRead(userId: string, id: string | null, at: Date) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: at },
    });
  },
};

export type NotificationRepository = typeof notificationRepository;
