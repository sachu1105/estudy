"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { progressService } from "@/server/services/progress";

const taskDoneSchema = z.object({ taskId: z.uuid(), done: z.boolean() });

export type TaskDoneResult =
  { ok: true; streak: number } | { ok: false; error: string };

/** Ticks or unticks a plan task (rule 9 first, zod, rate limited). */
export async function setTaskDoneAction(
  input: unknown,
): Promise<TaskDoneResult> {
  const user = await requireUser();
  const parsed = taskDoneSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "That didn't work. Refresh and try again." };
  const limited = await rateLimit([["podWritePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await progressService.setTaskDone(
    user,
    parsed.data.taskId,
    parsed.data.done,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/today");
  revalidatePath("/plan", "layout");
  revalidatePath("/pods", "layout");
  return { ok: true, streak: result.streak };
}
