import { createHmac } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { createRazorpayProvider } from "@/server/billing/razorpay";
import { prisma } from "@/server/db";
import { billingRepository } from "@/server/repositories/billing-repository";
import {
  createBillingService,
  GRACE_DAYS,
} from "@/server/services/billing/billing-service";

import { resetDatabase } from "./helpers";

const SECRET = "webhook-secret";
const clock = fixedClock("2026-10-13T04:30:00Z");
const calls: { path: string; body: unknown }[] = [];

const provider = createRazorpayProvider({
  keyId: "rzp_test_key",
  keySecret: "secret",
  webhookSecret: SECRET,
  plan: (plan) =>
    plan === "PRO"
      ? { id: "plan_pro", pricePaise: 19900 }
      : { id: "plan_elite", pricePaise: 39900 },
  baseUrl: "https://example.test",
  fetchImpl: (async (url: string, init: RequestInit) => {
    calls.push({
      path: new URL(url).pathname,
      body: init.body ? JSON.parse(init.body as string) : null,
    });
    return new Response(JSON.stringify({ id: "sub_123" }), { status: 200 });
  }) as unknown as typeof fetch,
});

const audits: { action: string }[] = [];
const billing = createBillingService({
  billing: billingRepository,
  clock,
  provider: () => provider,
  audit: async (entry) => void audits.push({ action: entry.action }),
});

async function user() {
  const u = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
    },
  });
  return { id: u.id, email: u.email, subscription: null };
}

function hook(event: string, extra: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    event,
    payload: {
      subscription: { entity: { id: "sub_123", ...extra } },
      payment: { entity: { id: "pay_1", amount: 19900 } },
    },
  });
  return {
    body,
    signature: createHmac("sha256", SECRET).update(body).digest("hex"),
  };
}

const END = Math.floor(Date.UTC(2026, 10, 13) / 1000);

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-13T04:30:00Z");
  calls.length = 0;
  audits.length = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("billing", () => {
  it("grants nothing until the provider says the subscription is active", async () => {
    const anu = await user();
    const started = await billing.startCheckout(anu, "PRO");
    expect(started).toMatchObject({ ok: true, keyId: "rzp_test_key" });
    expect(calls[0].path).toBe("/subscriptions");
    expect(calls[0].body).toMatchObject({ plan_id: "plan_pro" });
    // Abandoned checkout: the row exists but grants nothing.
    expect((await billing.current(anu))?.status).toBe("CANCELLED");

    const activated = hook("subscription.activated", { current_end: END });
    expect(
      await billing.applyWebhook(activated.body, activated.signature),
    ).toEqual({ ok: true, applied: true });
    const live = await billing.current(anu);
    expect(live).toMatchObject({ plan: "PRO", status: "ACTIVE" });
    expect(live?.periodEnd?.toISOString()).toBe(
      new Date(END * 1000).toISOString(),
    );
  });

  it("refuses an unsigned or wrongly signed webhook", async () => {
    const { body } = hook("subscription.activated");
    expect(await billing.applyWebhook(body, null)).toMatchObject({
      ok: false,
      code: "BAD_SIGNATURE",
    });
    expect(await billing.applyWebhook(body, "deadbeef")).toMatchObject({
      ok: false,
      code: "BAD_SIGNATURE",
    });
    expect(await prisma.payment.count()).toBe(0);
  });

  it("applies the same event only once, however often it is retried", async () => {
    const anu = await user();
    await billing.startCheckout(anu, "PRO");
    const charged = hook("subscription.charged", { current_end: END });
    expect(await billing.applyWebhook(charged.body, charged.signature)).toEqual(
      { ok: true, applied: true },
    );
    expect(await billing.applyWebhook(charged.body, charged.signature)).toEqual(
      { ok: true, applied: false },
    );
    expect(await prisma.payment.count()).toBe(1);
  });

  it("keeps the plan through a grace period after a failed payment, then expires it", async () => {
    const anu = await user();
    await billing.startCheckout(anu, "ELITE");
    const live = hook("subscription.activated", { current_end: END });
    await billing.applyWebhook(live.body, live.signature);

    const failed = hook("subscription.halted", { current_end: END });
    await billing.applyWebhook(failed.body, failed.signature);
    const due = await billing.current(anu);
    expect(due?.status).toBe("PAST_DUE");
    // Still ELITE while the grace period runs.
    expect(due?.plan).toBe("ELITE");
    expect(await billing.expireDue()).toBe(0);

    clock.set(
      new Date(
        clock.now().getTime() + (GRACE_DAYS + 1) * 86_400_000,
      ).toISOString(),
    );
    expect(await billing.expireDue()).toBe(1);
    expect(await billing.current(anu)).toBeNull();
    // Nothing of the person's was deleted along with the plan.
    expect(await prisma.user.count()).toBe(1);
  });

  it("cancels at the end of the period that was paid for", async () => {
    const anu = await user();
    await billing.startCheckout(anu, "PRO");
    const live = hook("subscription.activated", { current_end: END });
    await billing.applyWebhook(live.body, live.signature);

    expect(await billing.cancel(anu)).toEqual({ ok: true });
    expect(calls.at(-1)?.path).toBe("/subscriptions/sub_123/cancel");
    const after = await billing.current(anu);
    expect(after).toMatchObject({ status: "ACTIVE", cancelAtPeriodEnd: true });

    // It keeps working until the period ends, then expires.
    expect(await billing.expireDue()).toBe(0);
    clock.set("2026-11-14T00:00:00Z");
    expect(await billing.expireDue()).toBe(1);
    expect(await billing.current(anu)).toBeNull();
  });

  it("logs an event for a subscription it doesn't know, without failing", async () => {
    const stranger = hook("subscription.charged", { current_end: END });
    expect(
      await billing.applyWebhook(stranger.body, stranger.signature),
    ).toEqual({ ok: true, applied: true });
    expect(await prisma.payment.count()).toBe(1);
  });
});
