import "server-only";

import { Prisma } from "@/server/db/generated/prisma/client";
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

  /** Each person's current subscription, for marks shown beside many names at once. */
  async subscriptionsOf(ids: string[]) {
    const rows = await prisma.subscription.findMany({
      where: { userId: { in: ids }, status: { not: "EXPIRED" } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, plan: true, status: true, periodEnd: true },
    });
    const latest = new Map<string, Omit<(typeof rows)[number], "userId">>();
    for (const { userId, ...sub } of rows)
      if (!latest.has(userId)) latest.set(userId, sub);
    return latest;
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

  /** Everything the settings page and the owner's own profile card need. */
  profileOf(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        avatarKey: true,
        profileCover: true,
        handle: true,
        profilePublic: true,
        timezone: true,
        createdAt: true,
      },
    });
  },

  updateProfile(id: string, data: { displayName: string; bio: string | null }) {
    return prisma.user.update({ where: { id }, data });
  },

  /** The photo and the path that serves it move together, so they never disagree. */
  setAvatar(id: string, avatar: { key: string; url: string } | null) {
    return prisma.user.update({
      where: { id },
      data: {
        avatarKey: avatar?.key ?? null,
        avatarUrl: avatar?.url ?? null,
      },
    });
  },

  setProfileCover(id: string, cover: unknown) {
    return prisma.user.update({
      where: { id },
      data: { profileCover: cover === null ? Prisma.DbNull : cover },
    });
  },

  setSharing(
    id: string,
    data: { handle: string | null; profilePublic: boolean },
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  handleTaken(handle: string, exceptUserId: string) {
    return prisma.user.findFirst({
      where: { handle, id: { not: exceptUserId } },
      select: { id: true },
    });
  },

  /** A shared profile, by its handle. Only ever returns one that is actually shared. */
  findSharedByHandle(handle: string) {
    return prisma.user.findFirst({
      where: { handle, profilePublic: true, status: "ACTIVE" },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        profileCover: true,
        handle: true,
        timezone: true,
        streakResetAt: true,
        createdAt: true,
      },
    });
  },

  /** The key behind a profile image, for the route that serves it. */
  imageKeysOf(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { avatarKey: true, profileCover: true, profilePublic: true },
    });
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
