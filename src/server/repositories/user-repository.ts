import "server-only";

import { prisma } from "@/server/db";

const sessionUserSelect = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  name: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  timezone: true,
  beginnerMode: true,
  streakResetAt: true,
  status: true,
  subscriptions: {
    where: { status: { not: "EXPIRED" as const } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { plan: true, status: true, periodEnd: true },
  },
};

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findSessionUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: sessionUserSelect,
    });
    if (!user) return null;
    const { subscriptions, ...rest } = user;
    return { ...rest, subscription: subscriptions[0] ?? null };
  },

  /** Every new user starts with a FREE subscription row (BILLING_ENABLED=false still grants ELITE). */
  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    displayName: string;
    timezone: string;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        subscriptions: { create: { plan: "FREE", source: "DEFAULT" } },
      },
    });
  },

  markEmailVerified(id: string, at: Date) {
    return prisma.user.update({ where: { id }, data: { emailVerifiedAt: at } });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  upsertSuperAdmin(data: {
    email: string;
    passwordHash: string;
    verifiedAt: Date;
  }) {
    return prisma.user.upsert({
      where: { email: data.email },
      update: { role: "SUPER_ADMIN", status: "ACTIVE" },
      create: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: "Super admin",
        displayName: "Admin",
        role: "SUPER_ADMIN",
        emailVerifiedAt: data.verifiedAt,
        subscriptions: { create: { plan: "ELITE", source: "ADMIN_GRANT" } },
      },
    });
  },
};

export type UserRepository = typeof userRepository;
export type SessionUser = NonNullable<
  Awaited<ReturnType<UserRepository["findSessionUser"]>>
>;
