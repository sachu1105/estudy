import "server-only";

import { prisma } from "@/server/db";
import type { ReportTarget } from "@/server/db/generated/prisma/client";

/** Content a squad's staff can take down: everything reportable but a person or the squad. */
export const SQUAD_CONTENT = [
  "GROUP_ITEM",
  "GROUP_TEST",
  "POST",
  "REPLY",
  "MESSAGE",
] as const;
export type SquadContent = (typeof SQUAD_CONTENT)[number];

const isContent = (type: string): type is SquadContent =>
  (SQUAD_CONTENT as readonly string[]).includes(type);

/** Reports as squads see them (milestone 13; squads handle their own from here). */
export const reportRepository = {
  /**
   * Where reported content lives and who made it, read from the content itself, never
   * from what the browser said. Null when it's gone.
   */
  async locate(
    type: string,
    id: string,
  ): Promise<{ groupId: string; authorId: string } | null> {
    if (type === "GROUP_ITEM") {
      const i = await prisma.groupItem.findUnique({
        where: { id },
        select: { groupId: true, sharedById: true },
      });
      return i && { groupId: i.groupId, authorId: i.sharedById };
    }
    if (type === "GROUP_TEST") {
      const t = await prisma.groupTest.findUnique({
        where: { id },
        select: { groupId: true, sharedById: true },
      });
      return t && { groupId: t.groupId, authorId: t.sharedById };
    }
    if (type === "POST") {
      const p = await prisma.post.findUnique({
        where: { id },
        select: { groupId: true, authorId: true },
      });
      return p;
    }
    if (type === "REPLY") {
      const r = await prisma.reply.findUnique({
        where: { id },
        select: { authorId: true, post: { select: { groupId: true } } },
      });
      return r && { groupId: r.post.groupId, authorId: r.authorId };
    }
    if (type === "MESSAGE") {
      const m = await prisma.message.findUnique({
        where: { id },
        select: { groupId: true, authorId: true },
      });
      return m;
    }
    return null;
  },

  exists(reporterId: string, targetType: ReportTarget, targetId: string) {
    return prisma.report
      .count({ where: { reporterId, targetType, targetId } })
      .then((n) => n > 0);
  },

  /** The squad's owner, admins and moderators: who handles its reports. */
  async staffIds(groupId: string) {
    const rows = await prisma.membership.findMany({
      where: { groupId, role: { in: ["OWNER", "ADMIN", "MODERATOR"] } },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  /** Open reports about what's in a squad and its people, oldest first. */
  openInGroup(groupId: string) {
    return prisma.report.findMany({
      where: { groupId, status: "OPEN", targetType: { not: "GROUP" } },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        targetType: true,
        targetId: true,
        reason: true,
        note: true,
        createdAt: true,
      },
    });
  },

  /** What a report points at, for the squad's staff: a few words and where it is. */
  async describe(
    type: string,
    id: string,
  ): Promise<{
    label: string;
    excerpt: string | null;
    href: string;
    hidden: boolean;
    authorId: string;
  } | null> {
    if (type === "GROUP_ITEM") {
      const i = await prisma.groupItem.findUnique({
        where: { id },
        select: {
          title: true,
          groupId: true,
          sharedById: true,
          hiddenAt: true,
          deletedAt: true,
        },
      });
      return i && !i.deletedAt
        ? {
            label: `Shared material: ${i.title}`,
            excerpt: null,
            href: `/groups/${i.groupId}/items/${id}`,
            hidden: !!i.hiddenAt,
            authorId: i.sharedById,
          }
        : null;
    }
    if (type === "GROUP_TEST") {
      const t = await prisma.groupTest.findUnique({
        where: { id },
        select: {
          title: true,
          groupId: true,
          sharedById: true,
          hiddenAt: true,
        },
      });
      return t
        ? {
            label: `Shared test: ${t.title}`,
            excerpt: null,
            href: `/groups/${t.groupId}/tests/${id}`,
            hidden: !!t.hiddenAt,
            authorId: t.sharedById,
          }
        : null;
    }
    if (type === "POST") {
      const p = await prisma.post.findUnique({
        where: { id },
        select: {
          title: true,
          body: true,
          groupId: true,
          authorId: true,
          hiddenAt: true,
          deletedAt: true,
        },
      });
      return p && !p.deletedAt
        ? {
            label: `Post: ${p.title}`,
            excerpt: p.body.slice(0, 280),
            href: `/groups/${p.groupId}/discuss/${id}`,
            hidden: !!p.hiddenAt,
            authorId: p.authorId,
          }
        : null;
    }
    if (type === "REPLY") {
      const r = await prisma.reply.findUnique({
        where: { id },
        select: {
          body: true,
          authorId: true,
          hiddenAt: true,
          deletedAt: true,
          post: { select: { id: true, title: true, groupId: true } },
        },
      });
      return r && !r.deletedAt
        ? {
            label: `Reply in: ${r.post.title}`,
            excerpt: r.body.slice(0, 280),
            href: `/groups/${r.post.groupId}/discuss/${r.post.id}#reply-${id}`,
            hidden: !!r.hiddenAt,
            authorId: r.authorId,
          }
        : null;
    }
    if (type === "MESSAGE") {
      const m = await prisma.message.findUnique({
        where: { id },
        select: {
          body: true,
          groupId: true,
          authorId: true,
          hiddenAt: true,
          deletedAt: true,
          channel: { select: { id: true, name: true } },
        },
      });
      return m && !m.deletedAt
        ? {
            label: `Message in #${m.channel.name}`,
            excerpt: m.body.slice(0, 280),
            href: `/groups/${m.groupId}/c/${m.channel.id}`,
            hidden: !!m.hiddenAt,
            authorId: m.authorId,
          }
        : null;
    }
    // A person: the report is about them.
    return {
      label: "A member",
      excerpt: null,
      href: "",
      hidden: false,
      authorId: id,
    };
  },

  /** The people behind reports, as their squad knows them: name and role there. */
  people(groupId: string, userIds: string[]) {
    return prisma.membership.findMany({
      where: { groupId, userId: { in: userIds } },
      select: {
        role: true,
        mutedUntil: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  /** Takes reported content out of sight in this squad (kept for the record). */
  async hide(type: string, id: string, groupId: string, at: Date) {
    if (!isContent(type)) return;
    const data = { hiddenAt: at };
    if (type === "GROUP_ITEM")
      await prisma.groupItem.updateMany({ where: { id, groupId }, data });
    else if (type === "GROUP_TEST")
      await prisma.groupTest.updateMany({ where: { id, groupId }, data });
    else if (type === "POST")
      await prisma.post.updateMany({ where: { id, groupId }, data });
    else if (type === "REPLY")
      await prisma.reply.updateMany({ where: { id, post: { groupId } }, data });
    else await prisma.message.updateMany({ where: { id, groupId }, data });
  },

  /** Closes every open report on one thing in a squad. */
  close(
    type: ReportTarget,
    id: string,
    groupId: string,
    status: "RESOLVED" | "DISMISSED",
    by: string,
    at: Date,
  ) {
    return prisma.report.updateMany({
      where: { targetType: type, targetId: id, groupId, status: "OPEN" },
      data: { status, resolvedById: by, resolvedAt: at },
    });
  },
};

export type ReportRepository = typeof reportRepository;
