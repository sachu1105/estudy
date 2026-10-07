"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { notifyService } from "@/server/services/notifications/notify";

type Result = { ok: true } | { ok: false; error: string };

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 19:30.");

const prefsSchema = z.object({
  sessionReminder: z.boolean(),
  streakAtRisk: z.boolean(),
  weeklySummary: z.boolean(),
  byEmail: z.boolean(),
  byPush: z.boolean(),
  windowStart: time,
  quietFrom: time,
  quietTo: time,
});

/** The three reminders and the quiet hours, for the signed-in person only (rule 9). */
export async function saveNotifyPrefsAction(input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Check the times and try again.",
    };
  const saved = await notifyService.savePrefs(user, parsed.data);
  if (!saved) return { ok: false, error: "Use times like 19:30." };
  revalidatePath("/settings");
  return { ok: true };
}

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

/** Remembers this browser for push. The keys come from the browser's own subscription. */
export async function savePushSubscriptionAction(
  input: unknown,
): Promise<Result> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "That didn't work. Try again." };
  await notifyService.subscribe(user, { ...parsed.data, userAgent: null });
  return { ok: true };
}

export async function removePushSubscriptionAction(
  input: unknown,
): Promise<Result> {
  const user = await requireUser();
  const parsed = z.object({ endpoint: z.url().max(2000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That didn't work." };
  await notifyService.unsubscribe(user, parsed.data.endpoint);
  return { ok: true };
}
