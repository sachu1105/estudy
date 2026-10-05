import "server-only";

import { prisma } from "@/server/db";

type NewOneTimeToken = { userId: string; tokenHash: string; expiresAt: Date };

// Email verification and password reset links: single use, short lived, stored hashed.
export const oneTimeTokenRepository = {
  createVerification(data: NewOneTimeToken) {
    return prisma.emailVerification.create({ data });
  },

  findVerification(tokenHash: string) {
    return prisma.emailVerification.findUnique({ where: { tokenHash } });
  },

  /** True only for the first caller; a link can never be used twice. */
  async consumeVerification(id: string, now: Date) {
    const result = await prisma.emailVerification.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: now },
    });
    return result.count === 1;
  },

  createReset(data: NewOneTimeToken) {
    return prisma.passwordReset.create({ data });
  },

  findReset(tokenHash: string) {
    return prisma.passwordReset.findUnique({ where: { tokenHash } });
  },

  async consumeReset(id: string, now: Date) {
    const result = await prisma.passwordReset.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: now },
    });
    return result.count === 1;
  },

  /** Older reset links stop working once a new one is requested or a reset succeeds. */
  expireOpenResets(userId: string, now: Date) {
    return prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });
  },
};

export type OneTimeTokenRepository = typeof oneTimeTokenRepository;
