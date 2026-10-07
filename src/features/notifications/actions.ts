"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { notificationService } from "@/server/services/notifications";

/** Marks one notification read, or all of them (id null). */
export async function markReadAction(input: unknown) {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid().nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Try again." };
  await notificationService.markRead(user, parsed.data.id);
  revalidatePath("/notifications");
  return { ok: true as const };
}
