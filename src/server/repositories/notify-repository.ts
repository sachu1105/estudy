import "server-only";

import { prisma } from "@/server/db";
import type { ReminderKind } from "@/server/db/generated/prisma/client";

import { toDbDate } from "./plan-repository";

/** Notification preferences, push subscriptions and the reminder log (milestone 16). */
export const notifyRepository = {
  prefs(userId: string) {
    return prisma.notifyPrefs.findUnique({ where: { userId } });
  },

  savePrefs(
    userId: string,
    data: {
      sessionReminder: boolean;
      streakAtRisk: boolean;
      weeklySummary: boolean;
      byEmail: boolean;
      byPush: boolean;
      windowStartMin: number;
      quietFromMin: number;
      quietToMin: number;
    },
  ) {
    return prisma.notifyPrefs.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  /** Everyone who could be reminded: anyone with a push browser or email switched on. */
  candidates(limit = 2000) {
    return prisma.user.findMany({
      where: {
        status: "ACTIVE",
        emailVerifiedAt: { not: null },
        OR: [
          { notifyPrefs: { is: null } },
          { notifyPrefs: { OR: [{ byEmail: true }, { byPush: true }] } },
        ],
      },
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        streakResetAt: true,
        notifyPrefs: true,
      },
    });
  },

  subscriptions(userId: string) {
    return prisma.pushSubscription.findMany({ where: { userId } });
  },

  saveSubscription(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    at: Date;
  }) {
    const { at, ...rest } = data;
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: rest,
      update: { userId: data.userId, lastSeenAt: at },
    });
  },

  removeSubscription(endpoint: string, userId?: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint, ...(userId ? { userId } : {}) },
    });
  },

  /** What has already gone out today, so nothing is sent twice. */
  async sentOn(userId: string, localDate: string) {
    const rows = await prisma.reminderLog.findMany({
      where: { userId, localDate: toDbDate(localDate) },
      select: { kind: true },
    });
    return rows.map((r) => r.kind);
  },

  /** Writes the log row first; false means someone else already sent this one. */
  async claim(
    userId: string,
    kind: ReminderKind,
    localDate: string,
    channel: string,
  ) {
    const created = await prisma.reminderLog.createMany({
      data: [{ userId, kind, localDate: toDbDate(localDate), channel }],
      skipDuplicates: true,
    });
    return created.count > 0;
  },

  /** Minutes studied and tasks ticked today: either one means the day is not empty. */
  async activityOn(userId: string, localDate: string) {
    const date = toDbDate(localDate);
    const [sessions, tasks] = await Promise.all([
      prisma.studySession.aggregate({
        where: { userId, localDate: date },
        _sum: { activeMinutes: true },
      }),
      prisma.taskCompletion.count({
        where: { userId, localDate: date, done: true },
      }),
    ]);
    return { minutes: sessions._sum.activeMinutes ?? 0, tasks };
  },
};

export type NotifyRepository = typeof notifyRepository;
