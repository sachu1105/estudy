import "server-only";

import { prisma } from "@/server/db";

type NewToken = {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export const refreshTokenRepository = {
  create(data: NewToken) {
    return prisma.refreshToken.create({ data });
  },

  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  /**
   * Revokes `oldId` and issues its replacement atomically. Returns null when another
   * request already rotated `oldId` (a concurrent refresh, not necessarily theft).
   */
  rotate(oldId: string, next: NewToken, now: Date) {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: oldId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (claimed.count === 0) return null;
      const created = await tx.refreshToken.create({ data: next });
      await tx.refreshToken.update({
        where: { id: oldId },
        data: { replacedBy: created.id },
      });
      return created;
    });
  },

  revokeFamily(familyId: string, now: Date) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  },

  revokeAllForUser(userId: string, now: Date) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  },

  countActiveInFamily(familyId: string) {
    return prisma.refreshToken.count({ where: { familyId, revokedAt: null } });
  },
};

export type RefreshTokenRepository = typeof refreshTokenRepository;
