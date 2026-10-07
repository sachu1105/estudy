import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { notifyRepository } from "@/server/repositories/notify-repository";
import { createNotifyService } from "@/server/services/notifications/notify-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-13T13:30:00Z"); // 19:00 in Asia/Kolkata
const emails: { to: string; subject: string }[] = [];
const pushes: { endpoint: string; title: string }[] = [];
let gone = false;
let streak = 5;

const notify = createNotifyService({
  notify: notifyRepository,
  clock,
  streakOf: async () => streak,
  sendEmail: async (m) => void emails.push({ to: m.to, subject: m.subject }),
  sendPush: async (target, message) => {
    pushes.push({ endpoint: target.endpoint, title: message.title });
    return { ok: !gone, gone };
  },
  emailFor: (message, person) => ({
    to: person.email,
    subject: message.title,
    text: message.body,
    html: message.body,
  }),
});

async function person(timezone = "Asia/Kolkata") {
  const user = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
      timezone,
      emailVerifiedAt: new Date("2026-10-01T00:00:00Z"),
    },
  });
  return { id: user.id, email: user.email, subscription: null };
}

const subscribe = (user: { id: string }, endpoint = "https://push.test/a") =>
  notify.subscribe(user as never, {
    endpoint,
    p256dh: "key",
    auth: "auth",
    userAgent: "vitest",
  });

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-13T13:30:00Z");
  emails.length = 0;
  pushes.length = 0;
  gone = false;
  streak = 5;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("reminders", () => {
  it("sends the session reminder by email and push, once a day", async () => {
    const anu = await person();
    await subscribe(anu);
    expect(await notify.runDueReminders()).toBe(1);
    expect(emails).toEqual([{ to: anu.email, subject: "Ready when you are" }]);
    expect(pushes).toEqual([
      { endpoint: "https://push.test/a", title: "Ready when you are" },
    ]);
    // Run again in the same window: nothing repeats.
    expect(await notify.runDueReminders()).toBe(0);
    expect(emails).toHaveLength(1);
  });

  it("stays quiet once the person has studied today", async () => {
    const anu = await person();
    await prisma.studySession.create({
      data: {
        userId: anu.id,
        startedAt: clock.now(),
        endedAt: clock.now(),
        activeMinutes: 25,
        localDate: new Date("2026-10-13T00:00:00Z"),
      },
    });
    expect(await notify.runDueReminders()).toBe(0);
    expect(emails).toHaveLength(0);
  });

  it("warns about the streak in the evening, and not when there is none", async () => {
    await person();
    clock.set("2026-10-13T14:30:00Z"); // 20:00 IST
    expect(await notify.runDueReminders()).toBe(1);
    expect(emails[0].subject).toBe("Your streak is still on");

    await resetDatabase();
    await person();
    streak = 0;
    emails.length = 0;
    expect(await notify.runDueReminders()).toBe(0);
  });

  it("respects the switches and the quiet hours a person sets", async () => {
    const anu = await person();
    await subscribe(anu);
    await notify.savePrefs(anu, {
      sessionReminder: true,
      streakAtRisk: true,
      weeklySummary: true,
      byEmail: false,
      byPush: true,
      windowStart: "19:00",
      quietFrom: "18:00",
      quietTo: "23:00",
    });
    // 19:00 falls inside the quiet hours they chose.
    expect(await notify.runDueReminders()).toBe(0);

    await notify.savePrefs(anu, {
      sessionReminder: true,
      streakAtRisk: true,
      weeklySummary: true,
      byEmail: false,
      byPush: true,
      windowStart: "19:00",
      quietFrom: "22:00",
      quietTo: "07:00",
    });
    expect(await notify.runDueReminders()).toBe(1);
    // Push only: no email went out.
    expect(emails).toHaveLength(0);
    expect(pushes).toHaveLength(1);
  });

  it("uses each person's own timezone", async () => {
    // 13:30 UTC is 19:00 in Kolkata but 14:30 in London: only one is due.
    const london = await person("Europe/London");
    expect(await notify.runDueReminders()).toBe(0);
    const kolkata = await person();
    expect(await notify.runDueReminders()).toBe(1);
    expect(emails[0].to).toBe(kolkata.email);
    expect(london.id).toBeTruthy();
  });

  it("drops a browser that has forgotten its subscription", async () => {
    const anu = await person();
    await subscribe(anu);
    gone = true;
    await notify.runDueReminders();
    expect(await notify.subscriptions(anu)).toHaveLength(0);
  });

  it("refuses a time it cannot read", async () => {
    const anu = await person();
    expect(
      await notify.savePrefs(anu, {
        sessionReminder: true,
        streakAtRisk: true,
        weeklySummary: true,
        byEmail: true,
        byPush: true,
        windowStart: "25:00",
        quietFrom: "22:00",
        quietTo: "07:00",
      }),
    ).toBeNull();
  });
});
