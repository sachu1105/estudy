export type PaidPlan = "PRO" | "ELITE";

/** One checkout, as the browser needs it to open the provider's window. */
export type Checkout = {
  subscriptionId: string;
  /** The provider's public key; safe in the browser, unlike the secret. */
  keyId: string;
  amountPaise: number;
  plan: PaidPlan;
};

/**
 * What a provider event means to us, once the signature has been checked. Anything we
 * don't act on comes back as kind "other" and is still logged.
 */
export type BillingEvent = {
  /** The provider's event id: the same event is never applied twice. */
  eventId: string;
  name: string;
  subscriptionId: string | null;
  kind: "activated" | "charged" | "failed" | "cancelled" | "other";
  /** When the paid-up period ends, if the event says. */
  periodEnd: Date | null;
  amountPaise: number | null;
};

export interface BillingProvider {
  /** Starts a subscription the person then confirms in the provider's window. */
  createSubscription(input: {
    plan: PaidPlan;
    userId: string;
    email: string;
  }): Promise<Checkout>;
  /** Stops it at the end of the period that was paid for. */
  cancel(providerId: string): Promise<void>;
  /** Throws if the signature doesn't match; never trust an unverified body. */
  parseWebhook(body: string, signature: string | null): BillingEvent;
}
