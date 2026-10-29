// Paid squads and channels: what a pass costs, how long it lasts, and when it runs out.
// Pure, so the forms, the service and the tests agree.

import { z } from "zod";

import { rupees } from "@/lib/pricing/pricing";

/** ₹10 to ₹50,000: enough for a test series, never a typo's ₹5,00,000. */
export const MIN_RUPEES = 10;
export const MAX_RUPEES = 50_000;

/** How long one payment lets someone in. null: for good. */
export const ACCESS_PERIODS = [null, 30, 90, 180, 365] as const;
export type AccessDays = (typeof ACCESS_PERIODS)[number];

const PERIOD_LABELS: Record<string, string> = {
  null: "For good",
  30: "1 month",
  90: "3 months",
  180: "6 months",
  365: "1 year",
};

/** "For good", "3 months". */
export const periodLabel = (days: number | null) =>
  PERIOD_LABELS[String(days)] ?? `${days} days`;

/** "₹499 once", "₹199 a month", "₹999 for 3 months". */
export function priceLabel(pricePaise: number, accessDays: number | null) {
  const price = rupees(pricePaise);
  if (accessDays === null) return `${price} once`;
  if (accessDays === 30) return `${price} a month`;
  return `${price} for ${periodLabel(accessDays).toLowerCase()}`;
}

const days = z
  .union([z.literal(30), z.literal(90), z.literal(180), z.literal(365)])
  .nullable();

const rupeesField = z
  .number({ error: `Set a price from ₹${MIN_RUPEES} to ₹${MAX_RUPEES}.` })
  .int("Use whole rupees.")
  .min(MIN_RUPEES, `Set a price of at least ₹${MIN_RUPEES}.`)
  .max(
    MAX_RUPEES,
    `Keep the price under ₹${MAX_RUPEES.toLocaleString("en-IN")}.`,
  );

/** A channel's price: what one pass costs and how long it lasts. Null: free. */
export const channelPriceSchema = z
  .object({ rupees: rupeesField, accessDays: days })
  .nullable();

/** A squad's price, and what the owner tells people before they pay. Null: free. */
export const squadOfferSchema = z
  .object({
    rupees: rupeesField,
    accessDays: days,
    offer: z
      .string()
      .trim()
      .max(1000)
      .transform((o) => o || null),
    demoUrl: z
      .string()
      .trim()
      .max(500)
      .transform((u) => u || null)
      .pipe(
        z
          .url({
            protocol: /^https?$/,
            error: "Paste a full link to the demo, starting with https://",
          })
          .nullable(),
      ),
  })
  .nullable();

export type SquadOffer = NonNullable<z.infer<typeof squadOfferSchema>>;
export type ChannelPrice = NonNullable<z.infer<typeof channelPriceSchema>>;

/** Whether a pass that ends at `until` still lets someone in (null never ends). */
export const stillValid = (until: Date | null, now: Date) =>
  until === null || until > now;

/**
 * When a new pass ends. Renewing early adds to what is left rather than throwing it
 * away; a pass for good never ends.
 */
export function passEnds(
  current: Date | null | undefined,
  now: Date,
  accessDays: number | null,
) {
  if (accessDays === null) return null;
  const from = current && current.getTime() > now.getTime() ? current : now;
  return new Date(from.getTime() + accessDays * 86_400_000);
}

/** "12 Nov 2026", in India's time: when a pass ends or ended. */
export const passDate = (at: Date) =>
  at.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
