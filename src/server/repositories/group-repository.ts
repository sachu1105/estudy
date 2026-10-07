import "server-only";

import { prisma } from "@/server/db";
import type {
  GroupRole,
  GroupVisibility,
  ReportTarget,
  SquadJoinMode,
} from "@/server/db/generated/prisma/client";

const groupCard = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  joinMode: true,
  joinQuestion: true,
  hiddenAt: true,
  exam: { select: { id: true, name: true } },
  _count: { select: { members: true } },
} as const;

/** Groups, membership, invites, blocks and reports (milestone 13). */
export const groupRepository = {
  create(data: {
    name: string;
    description: string | null;
    examId: string | null;
    visibility: GroupVisibility;
    joinMode: SquadJoinMode;
    joinQuestion: string | null;
    ownerId: string;
  }) {
    return prisma.group.create({
      data: {
        ...data,
        members: { create: { userId: data.ownerId, role: "OWNER" } },
      },
    });
  },

  find(id: string) {
    return prisma.group.findFirst({
      where: { id, deletedAt: null },
      select: { ...groupCard, ownerId: true, createdAt: true },
    });
  },

  membership(groupId: string, userId: string) {
    return prisma.membership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  },

  countOwned: (userId: string) =>
    prisma.group.count({ where: { ownerId: userId, deletedAt: null } }),

  countMembers: (groupId: string) =>
    prisma.membership.count({ where: { groupId } }),

  countJoined: (userId: string) =>
    prisma.membership.count({
      where: { userId, role: { not: "OWNER" }, group: { deletedAt: null } },
    }),

  mine(userId: string) {
    return prisma.membership.findMany({
      where: { userId, group: { deletedAt: null } },
      orderBy: { joinedAt: "desc" },
      select: { role: true, group: { select: groupCard } },
    });
  },

  directory(examId: string | null, query: string) {
    return prisma.group.findMany({
      where: {
        visibility: "PUBLIC",
        deletedAt: null,
        hiddenAt: null,
        ...(examId ? { examId } : {}),
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      orderBy: [{ members: { _count: "desc" } }, { createdAt: "desc" }],
      take: 50,
      select: groupCard,
    });
  },

  addMember(groupId: string, userId: string) {
    return prisma.membership.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
  },

  removeMember(groupId: string, userId: string) {
    return prisma.membership.deleteMany({ where: { groupId, userId } });
  },

  setRole(groupId: string, userId: string, role: GroupRole) {
    return prisma.membership.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
    });
  },

  mute(groupId: string, userId: string, until: Date | null) {
    return prisma.membership.update({
      where: { groupId_userId: { groupId, userId } },
      data: { mutedUntil: until },
    });
  },

  members(groupId: string) {
    return prisma.membership.findMany({
      where: { groupId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: {
        role: true,
        mutedUntil: true,
        joinedAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  softDelete(groupId: string, at: Date) {
    return prisma.group.update({
      where: { id: groupId },
      data: { deletedAt: at },
    });
  },

  // ---- Join requests (private groups) -----------------------------------------------

  request(groupId: string, userId: string, answer: string | null) {
    return prisma.joinRequest.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, answer },
      update: { status: "PENDING", answer, decidedAt: null, decidedById: null },
    });
  },

  pendingRequests(groupId: string) {
    return prisma.joinRequest.findMany({
      where: { groupId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        answer: true,
        createdAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  myRequest(groupId: string, userId: string) {
    return prisma.joinRequest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  },

  findRequest(id: string) {
    return prisma.joinRequest.findUnique({ where: { id } });
  },

  decideRequest(id: string, approve: boolean, by: string, at: Date) {
    return prisma.joinRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "DECLINED",
        decidedById: by,
        decidedAt: at,
      },
    });
  },

  // ---- Invites ----------------------------------------------------------------------

  createInvite(data: {
    groupId: string;
    code: string;
    createdById: string;
    expiresAt: Date | null;
    maxUses: number | null;
  }) {
    return prisma.groupInvite.create({ data });
  },

  invites(groupId: string) {
    return prisma.groupInvite.findMany({
      where: { groupId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  inviteByCode(code: string) {
    return prisma.groupInvite.findUnique({
      where: { code },
      include: {
        group: { select: { id: true, ownerId: true, deletedAt: true } },
      },
    });
  },

  /** Counts a use only while uses remain: two people can't take the last seat. */
  async useInvite(id: string, maxUses: number | null) {
    const result = await prisma.groupInvite.updateMany({
      where: { id, ...(maxUses ? { uses: { lt: maxUses } } : {}) },
      data: { uses: { increment: 1 } },
    });
    return result.count === 1;
  },

  revokeInvite(id: string, groupId: string, at: Date) {
    return prisma.groupInvite.updateMany({
      where: { id, groupId },
      data: { revokedAt: at },
    });
  },

  // ---- Blocks and reports -----------------------------------------------------------

  block(blockerId: string, blockedId: string) {
    return prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  },

  unblock(blockerId: string, blockedId: string) {
    return prisma.block.deleteMany({ where: { blockerId, blockedId } });
  },

  async blockedIds(userId: string) {
    const rows = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return new Set(rows.map((r) => r.blockedId));
  },

  report(data: {
    reporterId: string;
    targetType: ReportTarget;
    targetId: string;
    groupId: string | null;
    reason: string;
    note: string | null;
  }) {
    return prisma.report.upsert({
      where: {
        reporterId_targetType_targetId: {
          reporterId: data.reporterId,
          targetType: data.targetType,
          targetId: data.targetId,
        },
      },
      create: data,
      update: {},
    });
  },
};

export type GroupRepository = typeof groupRepository;
