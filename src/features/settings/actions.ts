"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DISTRICTS } from "@/lib/progress/districts";
import { requireUser } from "@/server/auth/session";
import { profileService } from "@/server/services/profile";

const privacySchema = z.object({
  hideFromGlobalRank: z.boolean(),
  district: z.enum(DISTRICTS).nullable(),
});

/** Rule 9 first, zod on input; only the signed-in user's own settings change. */
export async function savePrivacyAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Pick a district from the list." };
  await profileService.savePrivacy(user, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/rank");
  return { ok: true };
}
