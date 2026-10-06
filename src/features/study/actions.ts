"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { sessionService } from "@/server/services/progress";

type Timer = { seconds: number; paused: boolean };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const invalid = {
  ok: false as const,
  error: "That didn't work. Refresh and try again.",
};

async function limited(userId: string) {
  const result = await rateLimit([["podWritePerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

export async function startSessionAction(
  input: unknown,
): Promise<Result<Timer & { closedOther: number }>> {
  const user = await requireUser();
  const parsed = z.object({ taskId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await sessionService.start(user, parsed.data.taskId);
  return result.ok
    ? {
        ok: true,
        seconds: result.seconds,
        paused: result.paused,
        closedOther: result.closedOther,
      }
    : { ok: false, error: result.message };
}

/** Every 60 s while the timer shows; also pause (true) and resume (false). */
export async function beatAction(input: unknown): Promise<Result<Timer>> {
  const user = await requireUser();
  const parsed = z.object({ paused: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return invalid;
  const timer = await sessionService.beat(user, parsed.data.paused);
  return timer
    ? { ok: true, seconds: timer.seconds, paused: timer.paused }
    : { ok: false, error: "This session has ended." };
}

export async function finishSessionAction(
  input: unknown,
): Promise<Result<{ minutes: number }>> {
  const user = await requireUser();
  const parsed = z.object({ complete: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await sessionService.finish(user, parsed.data.complete);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/today");
  revalidatePath("/plan", "layout");
  return { ok: true, minutes: result.minutes };
}
