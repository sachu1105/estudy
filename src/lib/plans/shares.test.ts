import { describe, expect, it } from "vitest";

import { MIN_BLOCK } from "@/lib/plan-engine";

import {
  focusOf,
  percentagesFor,
  scheduledExams,
  splitMinutes,
  type ShareExam,
} from "./shares";

const exam = (
  id: string,
  role: ShareExam["role"],
  endDate: string | null = null,
): ShareExam => ({ id, role, endDate });

const WEEK = [180, 120, 120, 120, 120, 120, 180];

/** Every weekday's slices add up to exactly what the user gave that day. */
function expectExact(week: readonly number[], split: Map<string, number[]>) {
  week.forEach((total, weekday) => {
    const sum = [...split.values()].reduce((n, days) => n + days[weekday], 0);
    expect(sum, `weekday ${weekday}`).toBe(total);
  });
}

describe("percentagesFor", () => {
  it("gives a lone exam the whole day", () => {
    expect(percentagesFor(0)).toEqual([100]);
  });

  it("splits 70/30, then 60/20/20", () => {
    expect(percentagesFor(1)).toEqual([70, 30]);
    expect(percentagesFor(2)).toEqual([60, 20, 20]);
  });

  it("keeps the focus ahead and always totals 100", () => {
    for (let alongside = 0; alongside <= 8; alongside++) {
      const pct = percentagesFor(alongside);
      expect(pct).toHaveLength(alongside + 1);
      expect(pct.reduce((n, p) => n + p, 0)).toBe(100);
      for (const share of pct.slice(1)) expect(pct[0]).toBeGreaterThan(share);
    }
  });
});

describe("scheduledExams", () => {
  it("drops paused exams", () => {
    const order = scheduledExams([
      exam("a", "FOCUS"),
      exam("b", "PAUSED"),
      exam("c", "ALONGSIDE"),
    ]);
    expect(order.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("leads with the focus, then orders by end date", () => {
    const order = scheduledExams([
      exam("late", "ALONGSIDE", "2026-12-01"),
      exam("soon", "ALONGSIDE", "2026-03-01"),
      exam("focus", "FOCUS", "2027-01-01"),
    ]);
    expect(order.map((e) => e.id)).toEqual(["focus", "soon", "late"]);
  });

  it("leads with the soonest exam when no focus is set", () => {
    const order = scheduledExams([
      exam("late", "ALONGSIDE", "2026-12-01"),
      exam("soon", "ALONGSIDE", "2026-03-01"),
    ]);
    expect(order[0].id).toBe("soon");
    expect(focusOf([exam("late", "ALONGSIDE", "2026-12-01")])?.id).toBe("late");
  });

  it("sorts undated exams last, then by id, so the order never wobbles", () => {
    const order = scheduledExams([
      exam("b", "ALONGSIDE", null),
      exam("a", "ALONGSIDE", null),
      exam("dated", "ALONGSIDE", "2026-05-01"),
    ]);
    expect(order.map((e) => e.id)).toEqual(["dated", "a", "b"]);
  });

  it("is empty when every exam is paused", () => {
    expect(scheduledExams([exam("a", "PAUSED"), exam("b", "PAUSED")])).toEqual(
      [],
    );
    expect(focusOf([exam("a", "PAUSED")])).toBeNull();
  });
});

describe("splitMinutes", () => {
  it("gives a lone exam every minute", () => {
    const split = splitMinutes(WEEK, [exam("a", "FOCUS")]);
    expect(split.get("a")).toEqual([...WEEK]);
  });

  it("splits two exams roughly 70/30 and loses nothing", () => {
    const split = splitMinutes(WEEK, [
      exam("focus", "FOCUS"),
      exam("other", "ALONGSIDE"),
    ]);
    // Sunday: 180 min -> 126 and 54, both landing on 5-minute steps.
    expect(split.get("focus")![0]).toBe(130);
    expect(split.get("other")![0]).toBe(50);
    expectExact(WEEK, split);
  });

  it("splits three exams with the crumbs going to the focus", () => {
    const split = splitMinutes(WEEK, [
      exam("focus", "FOCUS"),
      exam("b", "ALONGSIDE", "2026-01-01"),
      exam("c", "ALONGSIDE", "2026-02-01"),
    ]);
    expect(split.get("focus")![0]).toBe(110);
    expect(split.get("b")![0]).toBe(35);
    expect(split.get("c")![0]).toBe(35);
    expectExact(WEEK, split);
  });

  it("gives a paused exam nothing but still keys it", () => {
    const split = splitMinutes(WEEK, [
      exam("focus", "FOCUS"),
      exam("paused", "PAUSED"),
    ]);
    expect(split.get("paused")).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(split.get("focus")).toEqual([...WEEK]);
  });

  it("schedules nothing when every exam is paused", () => {
    const split = splitMinutes(WEEK, [
      exam("a", "PAUSED"),
      exam("b", "PAUSED"),
    ]);
    for (const days of split.values())
      expect(days).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("keeps rest days free for every exam", () => {
    const week = [0, 60, 0, 60, 0, 60, 0];
    const split = splitMinutes(week, [
      exam("focus", "FOCUS"),
      exam("other", "ALONGSIDE"),
    ]);
    for (const days of split.values())
      for (const weekday of [0, 2, 4, 6]) expect(days[weekday]).toBe(0);
    expectExact(week, split);
  });

  it("collapses a slice too small for one study block into the focus", () => {
    // 30 min a day: the other exam's 9 minutes could hold nothing, so the focus takes it.
    const week = Array.from({ length: 7 }, () => 30);
    const split = splitMinutes(week, [
      exam("focus", "FOCUS"),
      exam("other", "ALONGSIDE"),
    ]);
    expect(split.get("focus")![0]).toBe(30);
    expect(split.get("other")![0]).toBe(0);
    expectExact(week, split);
  });

  // The focus is the exception: a user who sets a 10-minute Tuesday gets a 10-minute
  // Tuesday, and the engine decides nothing fits. Only the other exams are held to a block.
  it("gives every other exam a whole block or nothing, and never loses a minute", () => {
    for (let total = 0; total <= 600; total += 1) {
      for (let count = 1; count <= 5; count++) {
        const exams = Array.from({ length: count }, (_, i) =>
          exam(`e${i}`, i === 0 ? "FOCUS" : "ALONGSIDE", `2026-0${i + 1}-01`),
        );
        const split = splitMinutes([total], exams);
        const where = `${total} min across ${count}`;
        expect(
          [...split.values()].reduce((n, days) => n + days[0], 0),
          where,
        ).toBe(total);
        if (total < MIN_BLOCK) expect(split.get("e0")![0], where).toBe(total);
        for (let i = 1; i < count; i++) {
          const slice = split.get(`e${i}`)![0];
          expect(slice === 0 || slice >= MIN_BLOCK, `${where}: ${slice}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("gives the focus the whole of a day too short for a block", () => {
    const split = splitMinutes(
      [10],
      [exam("focus", "FOCUS"), exam("other", "ALONGSIDE")],
    );
    expect(split.get("focus")![0]).toBe(10);
    expect(split.get("other")![0]).toBe(0);
  });

  it("is the same whatever order the exams arrive in", () => {
    const exams = [
      exam("c", "ALONGSIDE", "2026-03-01"),
      exam("a", "FOCUS", "2026-06-01"),
      exam("b", "ALONGSIDE", "2026-01-01"),
    ];
    const once = splitMinutes(WEEK, exams);
    const again = splitMinutes(WEEK, [...exams].reverse());
    for (const [id, days] of once) expect(again.get(id)).toEqual(days);
  });

  it("ignores negative and fractional minutes", () => {
    const split = splitMinutes([-30, 60.7], [exam("a", "FOCUS")]);
    expect(split.get("a")).toEqual([0, 60]);
  });
});
