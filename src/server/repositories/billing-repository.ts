import "server-only";

import { prisma } from "@/server/db";
import type {
  Plan,
  SubscriptionStatus,
} from "@/server/db/generated/prisma/client";

/** Subscriptions and the payment log (milestone 16). */
export const billingRepository = {
  current(userId: string) {
    return prisma.subscription.findFirst({
      where: { userId, status: { not: "EXPIRED" } },
      orderBy: { createdAt: "desc" },
    });
  },

  /** The paid subscription, if there is one; the default FREE row is not one. */
  paidSubscription(userId: string) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        plan: { in: ["PRO", "ELITE"] },
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  byProviderId(providerId: string) {
    return prisma.subscription.findUnique({ where: { providerId } });
  },

  /**
   * The row a checkout will fill in. It stays CANCELLED until the provider confirms,
   * so an abandoned checkout grants nothing.
   */
  upsertPending(data: {
    userId: string;
    plan: Plan;
    providerId: string;
    at: Date;
  }) {
    return prisma.subscription.upsert({
      where: { providerId: data.providerId },
      create: {
        userId: data.userId,
        plan: data.plan,
        providerId: data.providerId,
        status: "CANCELLED",
        source: "RAZORPAY",
      },
      update: { plan: data.plan },
    });
  },

  update(
    id: string,
    data: {
      status?: SubscriptionStatus;
      periodEnd?: Date | null;
      graceUntil?: Date | null;
      cancelAtPeriodEnd?: boolean;
    },
  ) {
    return prisma.subscription.update({ where: { id }, data });
  },

  setCancelAtPeriodEnd(id: string, on: boolean) {
    return prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: on },
    });
  },

  /** Paid plans whose grace or paid-up period has passed. */
  dueToExpire(at: Date) {
    return prisma.subscription.findMany({
      where: {
        plan: { in: ["PRO", "ELITE"] },
        status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED"] },
        OR: [
          { status: "PAST_DUE", graceUntil: { lt: at } },
          { status: "CANCELLED", periodEnd: { lt: at } },
          { status: "ACTIVE", cancelAtPeriodEnd: true, periodEnd: { lt: at } },
        ],
      },
      take: 500,
    });
  },

  /** Writes the event unless it is already there; false means "seen before". */
  async logEvent(entry: {
    eventId: string;
    event: string;
    providerId: string | null;
    amountPaise: number | null;
    userId: string | null;
    payload: unknown;
  }) {
    const created = await prisma.payment.createMany({
      data: [{ ...entry, payload: entry.payload as never }],
      skipDuplicates: true,
    });
    return created.count > 0;
  },

  payments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
  },
};

export type BillingRepository = typeof billingRepository;
