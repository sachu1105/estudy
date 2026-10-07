import type { Clock } from "@/lib/clock";
import type { BillingProvider, PaidPlan } from "@/server/billing/types";
import type { BillingRepository } from "@/server/repositories/billing-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";

type User = Actor & { id: string; email: string };

/** A failed payment keeps the plan working this long before it drops to FREE. */
export const GRACE_DAYS = 7;
const DAY = 86_400_000;

export type BillingDeps = {
  billing: BillingRepository;
  clock: Clock;
  /** Null while BILLING_ENABLED is false: nothing can be bought. */
  provider: () => BillingProvider | null;
  audit: (entry: {
    actorId: string | null;
    action: string;
    targetId?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  }) => Promise<unknown>;
};

const OFF = failure(
  "BILLING_OFF",
  "Payments aren't open yet. Everything is free during launch.",
);

/**
 * Subscriptions (milestone 16). A webhook is applied once, by its event id, and a plan
 * ending never deletes anything: the person simply drops to FREE.
 */
export function createBillingService(deps: BillingDeps) {
  const now = () => deps.clock.now();

  return {
    /** Starts a checkout the browser finishes in the provider's own window. */
    async startCheckout(
      user: User,
      plan: PaidPlan,
    ): Promise<
      Result<{ subscriptionId: string; keyId: string; amountPaise: number }>
    > {
      const provider = deps.provider();
      if (!provider) return OFF;
      const checkout = await provider.createSubscription({
        plan,
        userId: user.id,
        email: user.email,
      });
      // Pending until the provider says it is active: nothing is granted here.
      await deps.billing.upsertPending({
        userId: user.id,
        plan,
        providerId: checkout.subscriptionId,
        at: now(),
      });
      await deps.audit({
        actorId: user.id,
        action: "billing.checkout_started",
        metadata: { plan, providerId: checkout.subscriptionId },
      });
      return {
        ok: true,
        subscriptionId: checkout.subscriptionId,
        keyId: checkout.keyId,
        amountPaise: checkout.amountPaise,
      };
    },

    /** Stops at the end of the period already paid for; the plan keeps working until then. */
    async cancel(user: User): Promise<Result<object>> {
      const provider = deps.provider();
      const current = await deps.billing.paidSubscription(user.id);
      if (!current?.providerId)
        return failure(
          "NO_SUBSCRIPTION",
          "You don't have a paid plan to cancel.",
        );
      if (provider) await provider.cancel(current.providerId);
      await deps.billing.setCancelAtPeriodEnd(current.id, true);
      await deps.audit({
        actorId: user.id,
        action: "billing.cancelled",
        metadata: { providerId: current.providerId },
      });
      return { ok: true };
    },

    /**
     * Applies one verified provider event. Returns `applied: false` when the same event
     * has already been handled, so a provider's retries are harmless.
     */
    async applyWebhook(
      body: string,
      signature: string | null,
    ): Promise<Result<{ applied: boolean }>> {
      const provider = deps.provider();
      if (!provider) return OFF;
      let event;
      try {
        event = provider.parseWebhook(body, signature);
      } catch {
        return failure("BAD_SIGNATURE", "That request wasn't signed properly.");
      }
      const subscription = event.subscriptionId
        ? await deps.billing.byProviderId(event.subscriptionId)
        : null;
      const stored = await deps.billing.logEvent({
        eventId: event.eventId,
        event: event.name,
        providerId: event.subscriptionId,
        amountPaise: event.amountPaise,
        userId: subscription?.userId ?? null,
        payload: JSON.parse(body) as unknown,
      });
      if (!stored) return { ok: true, applied: false };
      if (!subscription) return { ok: true, applied: true };

      const at = now();
      if (event.kind === "activated" || event.kind === "charged") {
        await deps.billing.update(subscription.id, {
          status: "ACTIVE",
          periodEnd: event.periodEnd,
          graceUntil: null,
        });
      } else if (event.kind === "failed") {
        // The plan keeps working through the grace period, then falls back to FREE.
        await deps.billing.update(subscription.id, {
          status: "PAST_DUE",
          graceUntil: new Date(at.getTime() + GRACE_DAYS * DAY),
        });
      } else if (event.kind === "cancelled") {
        await deps.billing.update(subscription.id, {
          status: "CANCELLED",
          cancelAtPeriodEnd: true,
          // It still works until the period that was paid for ends.
          periodEnd: event.periodEnd ?? subscription.periodEnd,
        });
      }
      await deps.audit({
        actorId: subscription.userId,
        action: `billing.${event.kind}`,
        metadata: { event: event.name, providerId: event.subscriptionId },
      });
      return { ok: true, applied: true };
    },

    /**
     * Ends subscriptions whose grace or paid period has passed. Nothing is deleted: the
     * person drops to FREE and anything over the new limits becomes read-only.
     */
    async expireDue() {
      const due = await deps.billing.dueToExpire(now());
      for (const subscription of due) {
        await deps.billing.update(subscription.id, { status: "EXPIRED" });
        await deps.audit({
          actorId: null,
          action: "billing.expired",
          targetId: subscription.userId,
          metadata: { plan: subscription.plan },
        });
      }
      return due.length;
    },

    current: (user: User) => deps.billing.current(user.id),
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
