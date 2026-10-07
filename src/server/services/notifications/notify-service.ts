import { toLocalDate, type Clock } from "@/lib/clock";
import {
  minutesOf,
  remindersDue,
  type Prefs,
  type ReminderKind,
} from "@/lib/reminders/reminders";
import type { NotifyRepository } from "@/server/repositories/notify-repository";
import type { Actor } from "@/server/services/syllabus/deps";

type User = Actor;

export const DEFAULT_PREFS: Prefs = {
  sessionReminder: true,
  streakAtRisk: true,
  weeklySummary: true,
  byEmail: true,
  byPush: true,
  windowStartMin: 19 * 60,
  quietFromMin: 22 * 60,
  quietToMin: 7 * 60,
};

export type ReminderMessage = {
  kind: ReminderKind;
  title: string;
  body: string;
  url: string;
};

export type NotifyDeps = {
  notify: NotifyRepository;
  clock: Clock;
  /** The person's streak today, for the evening warning. */
  streakOf: (userId: string, timezone: string) => Promise<number>;
  sendEmail: (message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
  sendPush: (
    target: { endpoint: string; p256dh: string; auth: string },
    message: { title: string; body: string; url: string; tag?: string },
  ) => Promise<{ ok: boolean; gone: boolean }>;
  emailFor: (
    message: ReminderMessage,
    person: { email: string; name: string },
  ) => { to: string; subject: string; text: string; html: string };
};

const COPY: Record<ReminderKind, Omit<ReminderMessage, "kind">> = {
  SESSION: {
    title: "Ready when you are",
    body: "Your study window starts now. Today's tasks are waiting.",
    url: "/today",
  },
  STREAK: {
    title: "Your streak is still on",
    body: "Nothing logged today. A few minutes keeps it going.",
    url: "/today",
  },
  WEEKLY: {
    title: "Last week, in short",
    body: "Your weekly summary is ready, and this week's plan is set.",
    url: "/progress",
  },
};

/**
 * The three reminders, and the switches behind them (milestone 16). Nothing is sent
 * during quiet hours, and each kind goes out at most once a person a day.
 */
export function createNotifyService(deps: NotifyDeps) {
  async function prefsOf(userId: string): Promise<Prefs> {
    const saved = await deps.notify.prefs(userId);
    return saved ? { ...DEFAULT_PREFS, ...saved } : DEFAULT_PREFS;
  }

  return {
    prefsOf: (user: User) => prefsOf(user.id),

    savePrefs(
      user: User,
      input: Omit<Prefs, "windowStartMin" | "quietFromMin" | "quietToMin"> & {
        windowStart: string;
        quietFrom: string;
        quietTo: string;
      },
    ) {
      const times = {
        windowStartMin: minutesOf(input.windowStart),
        quietFromMin: minutesOf(input.quietFrom),
        quietToMin: minutesOf(input.quietTo),
      };
      if (
        times.windowStartMin === null ||
        times.quietFromMin === null ||
        times.quietToMin === null
      )
        return null;
      return deps.notify.savePrefs(user.id, {
        sessionReminder: input.sessionReminder,
        streakAtRisk: input.streakAtRisk,
        weeklySummary: input.weeklySummary,
        byEmail: input.byEmail,
        byPush: input.byPush,
        windowStartMin: times.windowStartMin,
        quietFromMin: times.quietFromMin,
        quietToMin: times.quietToMin,
      });
    },

    subscriptions: (user: User) => deps.notify.subscriptions(user.id),

    subscribe(
      user: User,
      input: {
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent: string | null;
      },
    ) {
      return deps.notify.saveSubscription({
        userId: user.id,
        ...input,
        at: deps.clock.now(),
      });
    },

    unsubscribe: (user: User, endpoint: string) =>
      deps.notify.removeSubscription(endpoint, user.id),

    /**
     * Runs every half hour: looks at each person's own local time and sends what is due.
     * Returns how many messages went out.
     */
    async runDueReminders(
      weeklyReadyFor: (userId: string) => boolean = () => false,
    ) {
      const people = await deps.notify.candidates();
      const at = deps.clock.now();
      let sent = 0;
      for (const person of people) {
        const prefs = person.notifyPrefs
          ? { ...DEFAULT_PREFS, ...person.notifyPrefs }
          : DEFAULT_PREFS;
        const zone = person.timezone || "Asia/Kolkata";
        const localDate = toLocalDate(at, zone);
        const local = new Date(
          new Date(at.toLocaleString("en-US", { timeZone: zone })).getTime(),
        );
        const nowMin = local.getHours() * 60 + local.getMinutes();
        const weekday = ((local.getDay() + 6) % 7) + 1;

        const activity = await deps.notify.activityOn(person.id, localDate);
        const due = remindersDue(prefs, {
          nowMin,
          weekday,
          studiedToday: activity.minutes > 0 || activity.tasks > 0,
          streak: await deps.streakOf(person.id, zone),
          weeklyReady: weeklyReadyFor(person.id),
          sentToday: await deps.notify.sentOn(person.id, localDate),
        });

        for (const kind of due) {
          const channel = [
            prefs.byPush ? "push" : null,
            prefs.byEmail ? "email" : null,
          ]
            .filter(Boolean)
            .join("+");
          // Claim first: two workers can run this at the same time.
          if (!(await deps.notify.claim(person.id, kind, localDate, channel)))
            continue;
          const message = { kind, ...COPY[kind] };
          if (prefs.byPush) {
            for (const target of await deps.notify.subscriptions(person.id)) {
              const result = await deps.sendPush(target, {
                ...message,
                tag: kind,
              });
              if (result.gone)
                await deps.notify.removeSubscription(target.endpoint);
            }
          }
          if (prefs.byEmail)
            await deps.sendEmail(
              deps.emailFor(message, {
                email: person.email,
                name: person.name,
              }),
            );
          sent++;
        }
      }
      return sent;
    },
  };
}

export type NotifyService = ReturnType<typeof createNotifyService>;
