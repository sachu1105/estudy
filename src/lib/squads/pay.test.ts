import { describe, expect, it } from "vitest";

import {
  channelPriceSchema,
  offerPoints,
  passEnds,
  periodLabel,
  priceLabel,
  squadOfferSchema,
  stillValid,
} from "./pay";

const DAY = 86_400_000;
const now = new Date("2026-10-29T06:00:00Z");

describe("squad passes", () => {
  it("says what a pass costs the way a reader expects", () => {
    expect(priceLabel(49900, null)).toBe("₹499 once");
    expect(priceLabel(19900, 30)).toBe("₹199 a month");
    expect(priceLabel(99900, 90)).toBe("₹999 for 3 months");
    expect(periodLabel(null)).toBe("For good");
    expect(periodLabel(365)).toBe("1 year");
  });

  it("starts a pass now, or adds to one that is still running", () => {
    expect(passEnds(null, now, 30)).toEqual(new Date(now.getTime() + 30 * DAY));
    const running = new Date(now.getTime() + 5 * DAY);
    expect(passEnds(running, now, 30)).toEqual(
      new Date(now.getTime() + 35 * DAY),
    );
    // A pass that already ran out is not added to: the new one starts today.
    const ended = new Date(now.getTime() - 5 * DAY);
    expect(passEnds(ended, now, 30)).toEqual(
      new Date(now.getTime() + 30 * DAY),
    );
    expect(passEnds(running, now, null)).toBeNull();
  });

  it("treats a pass for good as never ending", () => {
    expect(stillValid(null, now)).toBe(true);
    expect(stillValid(new Date(now.getTime() + 1), now)).toBe(true);
    expect(stillValid(now, now)).toBe(false);
  });

  it("takes whole rupees within the limits", () => {
    expect(
      channelPriceSchema.safeParse({ rupees: 199, accessDays: 30 }).success,
    ).toBe(true);
    expect(
      channelPriceSchema.safeParse({ rupees: 5, accessDays: 30 }).success,
    ).toBe(false);
    expect(
      channelPriceSchema.safeParse({ rupees: 99.5, accessDays: null }).success,
    ).toBe(false);
    expect(
      channelPriceSchema.safeParse({ rupees: 60_000, accessDays: null })
        .success,
    ).toBe(false);
    expect(
      channelPriceSchema.safeParse({ rupees: 199, accessDays: 45 }).success,
    ).toBe(false);
    expect(channelPriceSchema.parse(null)).toBeNull();
  });

  it("keeps a squad's pitch tidy and its demo link a real web link", () => {
    expect(
      squadOfferSchema.parse({
        rupees: 499,
        accessDays: null,
        offer: "  Daily mocks  ",
        demoUrl: "",
      }),
    ).toEqual({
      rupees: 499,
      accessDays: null,
      offer: "Daily mocks",
      demoUrl: null,
    });
    expect(
      squadOfferSchema.safeParse({
        rupees: 499,
        accessDays: 30,
        offer: "",
        demoUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      squadOfferSchema.parse({
        rupees: 499,
        accessDays: 30,
        offer: "",
        demoUrl: "https://youtube.com/watch?v=abc",
      })?.demoUrl,
    ).toBe("https://youtube.com/watch?v=abc");
  });

  it("splits an owner's offer into points, keeping amounts whole", () => {
    expect(offerPoints("Daily notes , current affairs, weekly mock")).toEqual([
      "Daily notes",
      "Current affairs",
      "Weekly mock",
    ]);
    expect(offerPoints("- Notes\n- Tests worth ₹1,000")).toEqual([
      "Notes",
      "Tests worth ₹1,000",
    ]);
    expect(offerPoints(null)).toEqual([]);
  });
});
