import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  BillingEvent,
  BillingProvider,
  Checkout,
  PaidPlan,
} from "./types";

// Razorpay subscriptions over their REST API: no SDK, just fetch and an HMAC check.
// Everything here runs on the server; only keyId ever reaches the browser.

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  planIds: Record<PaidPlan, string>;
  pricePaise: Record<PaidPlan, number>;
  /** Months a subscription runs before Razorpay asks again. */
  totalCount?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const API = "https://api.razorpay.com/v1";

export function createRazorpayProvider(
  config: RazorpayConfig,
): BillingProvider {
  const call = async (path: string, body?: unknown) => {
    const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString(
      "base64",
    );
    const response = await (config.fetchImpl ?? fetch)(
      `${config.baseUrl ?? API}${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    const text = await response.text();
    if (!response.ok)
      throw new Error(`Razorpay ${path} failed: ${response.status} ${text}`);
    return JSON.parse(text) as Record<string, unknown>;
  };

  return {
    async createSubscription({ plan, userId, email }): Promise<Checkout> {
      const created = await call("/subscriptions", {
        plan_id: config.planIds[plan],
        total_count: config.totalCount ?? 12,
        customer_notify: 1,
        notes: { userId, email, plan },
      });
      return {
        subscriptionId: String(created.id),
        keyId: config.keyId,
        amountPaise: config.pricePaise[plan],
        plan,
      };
    },

    async cancel(providerId) {
      // false: stop at the end of the period the person already paid for.
      await call(`/subscriptions/${providerId}/cancel`, {
        cancel_at_cycle_end: 1,
      });
    },

    parseWebhook(body, signature) {
      const expected = createHmac("sha256", config.webhookSecret)
        .update(body)
        .digest("hex");
      const given = Buffer.from(signature ?? "", "utf8");
      const mine = Buffer.from(expected, "utf8");
      if (
        given.length !== mine.length ||
        !timingSafeEqual(new Uint8Array(given), new Uint8Array(mine))
      )
        throw new Error("Bad webhook signature");
      return readEvent(JSON.parse(body) as RazorpayHook);
    },
  };
}

type RazorpayHook = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        current_end?: number;
        charge_at?: number;
      };
    };
    payment?: { entity?: { id?: string; amount?: number } };
  };
};

const KINDS: Record<string, BillingEvent["kind"]> = {
  "subscription.activated": "activated",
  "subscription.resumed": "activated",
  "subscription.charged": "charged",
  "subscription.halted": "failed",
  "subscription.pending": "failed",
  "subscription.cancelled": "cancelled",
  "subscription.completed": "cancelled",
};

/** Turns one hook body into the few facts we act on. Exported for the tests. */
export function readEvent(hook: RazorpayHook): BillingEvent {
  const subscription = hook.payload?.subscription?.entity;
  const seconds = subscription?.current_end ?? subscription?.charge_at ?? null;
  return {
    // Razorpay has no event id in the body, so the subscription and its period make one.
    eventId: `${hook.event ?? "unknown"}:${subscription?.id ?? hook.payload?.payment?.entity?.id ?? "none"}:${seconds ?? 0}`,
    name: hook.event ?? "unknown",
    subscriptionId: subscription?.id ?? null,
    kind: KINDS[hook.event ?? ""] ?? "other",
    periodEnd: seconds ? new Date(seconds * 1000) : null,
    amountPaise: hook.payload?.payment?.entity?.amount ?? null,
  };
}
