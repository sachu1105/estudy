import "server-only";

import { prisma } from "@/server/db";
import type {
  ChannelPostRule,
  ChannelType,
  ChannelViewRule,
  NotifyLevel,
} from "@/server/db/generated/prisma/client";
import type { SquadTemplate } from "@/lib/squads/templates";

const channelRow = {
  id: true,
  groupId: true,
  categoryId: true,
  type: true,
  name: true,
  topic: true,
  order: true,
  postRule: true,
  viewRule: true,
  slowModeSec: true,
  subjectName: true,
} as const;

/** A squad's categories and channels (squads S1). */
export const channelRepository = {
  /** Lays out a template's categories and channels in a new squad. */
  async createFromTemplate(groupId: string, template: SquadTemplate) {
    await prisma.$transaction(
      template.categories.map((category, c) =>
        prisma.channelCategory.create({
          data: {
            groupId,
            name: category.name,
            order: c,
            channels: {
              create: category.channels.map((ch, i) => ({
                groupId,
                type: ch.type,
                name: ch.name,
                topic: ch.topic,
                postRule: ch.postRule,
                order: i,
              })),
            },
          },
        }),
      ),
    );
  },

  categories(groupId: string) {
    return prisma.channelCategory.findMany({
      where: { groupId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, order: true },
    });
  },

  /**
   * The squad's channels, or only the ones this person may open. Staff (owner, admins
   * and moderators) see them all, including the private ones they run.
   */
  channels(groupId: string, forUser?: { id: string; staff: boolean }) {
    return prisma.channel.findMany({
      where: {
        groupId,
        deletedAt: null,
        ...(forUser && !forUser.staff
          ? {
              OR: [
                { viewRule: "EVERYONE" as const },
                {
                  viewRule: "PICKED" as const,
                  access: { some: { userId: forUser.id } },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: channelRow,
    });
  },

  hasAccess(channelId: string, userId: string) {
    return prisma.channelAccess
      .findUnique({
        where: { channelId_userId: { channelId, userId } },
        select: { id: true },
      })
      .then(Boolean);
  },

  /** Who is let into a PICKED channel, by hand. */
  accessIds(channelId: string) {
    return prisma.channelAccess
      .findMany({ where: { channelId }, select: { userId: true } })
      .then((rows) => rows.map((r) => r.userId));
  },

  async setAccess(channelId: string, userIds: string[]) {
    await prisma.$transaction([
      prisma.channelAccess.deleteMany({
        where: { channelId, userId: { notIn: userIds } },
      }),
      prisma.channelAccess.createMany({
        data: userIds.map((userId) => ({ channelId, userId })),
        skipDuplicates: true,
      }),
    ]);
  },

  /** How much of each channel of a squad reaches this person. */
  async notifyLevels(userId: string, groupId: string) {
    const rows = await prisma.channelNotify.findMany({
      where: { userId, channel: { groupId } },
      select: { channelId: true, level: true },
    });
    return new Map(rows.map((r) => [r.channelId, r.level]));
  },

  /** Of these people, who has muted this channel. */
  async mutedOn(channelId: string, userIds: string[]) {
    if (!userIds.length) return new Set<string>();
    const rows = await prisma.channelNotify.findMany({
      where: { channelId, level: "MUTE", userId: { in: userIds } },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  },

  async setNotify(userId: string, channelId: string, level: NotifyLevel) {
    if (level === "ALL")
      await prisma.channelNotify.deleteMany({ where: { userId, channelId } });
    else
      await prisma.channelNotify.upsert({
        where: { userId_channelId: { userId, channelId } },
        create: { userId, channelId, level },
        update: { level },
      });
  },

  find(groupId: string, channelId: string) {
    return prisma.channel.findFirst({
      where: { id: channelId, groupId, deletedAt: null },
      select: channelRow,
    });
  },

  /** The first channel of a type, for writes that don't name a channel. */
  firstOfType(groupId: string, type: ChannelType) {
    return prisma.channel.findFirst({
      where: { groupId, type, deletedAt: null },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
      select: channelRow,
    });
  },

  count: (groupId: string) =>
    prisma.channel.count({ where: { groupId, deletedAt: null } }),

  findCategory(groupId: string, categoryId: string) {
    return prisma.channelCategory.findFirst({
      where: { id: categoryId, groupId },
      select: { id: true, name: true, order: true },
    });
  },

  async create(data: {
    groupId: string;
    categoryId: string | null;
    type: ChannelType;
    name: string;
    topic: string | null;
    postRule: ChannelPostRule;
    viewRule: ChannelViewRule;
    slowModeSec: number;
    subjectName?: string | null;
  }) {
    const last = await prisma.channel.aggregate({
      where: {
        groupId: data.groupId,
        categoryId: data.categoryId,
        deletedAt: null,
      },
      _max: { order: true },
    });
    return prisma.channel.create({
      data: { ...data, order: (last._max.order ?? -1) + 1 },
      select: channelRow,
    });
  },

  update(
    channelId: string,
    data: {
      name?: string;
      topic?: string | null;
      postRule?: ChannelPostRule;
      viewRule?: ChannelViewRule;
      slowModeSec?: number;
      subjectName?: string | null;
    },
  ) {
    return prisma.channel.update({
      where: { id: channelId },
      data,
      select: channelRow,
    });
  },

  /** To the end of another category (null: above the categories). */
  async moveToCategory(
    groupId: string,
    channelId: string,
    categoryId: string | null,
  ) {
    const last = await prisma.channel.aggregate({
      where: { groupId, categoryId, deletedAt: null },
      _max: { order: true },
    });
    return prisma.channel.update({
      where: { id: channelId },
      data: { categoryId, order: (last._max.order ?? -1) + 1 },
    });
  },

  softDelete(channelId: string, at: Date) {
    return prisma.channel.update({
      where: { id: channelId },
      data: { deletedAt: at },
    });
  },

  /** The channel above or below in its category, to swap places with. */
  neighbour(
    groupId: string,
    channel: { categoryId: string | null; order: number },
    direction: "up" | "down",
  ) {
    return prisma.channel.findFirst({
      where: {
        groupId,
        categoryId: channel.categoryId,
        deletedAt: null,
        order:
          direction === "up" ? { lt: channel.order } : { gt: channel.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
  },

  async swapChannels(
    a: { id: string; order: number },
    b: { id: string; order: number },
  ) {
    await prisma.$transaction([
      prisma.channel.update({ where: { id: a.id }, data: { order: b.order } }),
      prisma.channel.update({ where: { id: b.id }, data: { order: a.order } }),
    ]);
  },

  async createCategory(groupId: string, name: string) {
    const last = await prisma.channelCategory.aggregate({
      where: { groupId },
      _max: { order: true },
    });
    return prisma.channelCategory.create({
      data: { groupId, name, order: (last._max.order ?? -1) + 1 },
      select: { id: true, name: true, order: true },
    });
  },

  renameCategory(categoryId: string, name: string) {
    return prisma.channelCategory.update({
      where: { id: categoryId },
      data: { name },
    });
  },

  categoryNeighbour(groupId: string, order: number, direction: "up" | "down") {
    return prisma.channelCategory.findFirst({
      where: {
        groupId,
        order: direction === "up" ? { lt: order } : { gt: order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
  },

  async swapCategories(
    a: { id: string; order: number },
    b: { id: string; order: number },
  ) {
    await prisma.$transaction([
      prisma.channelCategory.update({
        where: { id: a.id },
        data: { order: b.order },
      }),
      prisma.channelCategory.update({
        where: { id: b.id },
        data: { order: a.order },
      }),
    ]);
  },

  /** Its channels stay, listed after the channels above the categories. */
  async deleteCategory(groupId: string, categoryId: string) {
    await prisma.$transaction(async (tx) => {
      const [last, moving] = await Promise.all([
        tx.channel.aggregate({
          where: { groupId, categoryId: null, deletedAt: null },
          _max: { order: true },
        }),
        tx.channel.findMany({
          where: { categoryId },
          orderBy: { order: "asc" },
          select: { id: true },
        }),
      ]);
      const start = (last._max.order ?? -1) + 1;
      for (const [i, c] of moving.entries())
        await tx.channel.update({
          where: { id: c.id },
          data: { categoryId: null, order: start + i },
        });
      await tx.channelCategory.delete({ where: { id: categoryId } });
    });
  },
};

export type ChannelRepository = typeof channelRepository;
