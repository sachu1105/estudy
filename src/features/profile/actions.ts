"use server";

import { revalidatePath } from "next/cache";

import type { PodCover } from "@/lib/pods/covers";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { profileService } from "@/server/services/profile";

import {
  saveProfileSchema,
  setAvatarSchema,
  setProfileCoverSchema,
  setSharingSchema,
  type ActionResult,
} from "./schemas";

// requireUser() first (rule 9), zod on every input (rule 11), writes rate limited (rule 13).

const invalid = {
  ok: false,
  error: "That didn't work. Refresh and try again.",
} as const;

async function limited(userId: string) {
  const result = await rateLimit([["podWritePerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

/** Everything the profile touches shows up in the shell (the avatar) and on the page. */
function revalidateProfile() {
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = saveProfileSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await profileService.save(user, parsed.data);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateProfile();
  return { ok: true };
}

export async function setAvatarAction(
  input: unknown,
): Promise<ActionResult<{ avatarUrl: string | null }>> {
  const user = await requireUser();
  const parsed = setAvatarSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await profileService.setAvatar(user, parsed.data.key);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateProfile();
  return { ok: true, avatarUrl: result.avatarUrl };
}

export async function setProfileCoverAction(
  input: unknown,
): Promise<ActionResult<{ cover: PodCover }>> {
  const user = await requireUser();
  const parsed = setProfileCoverSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await profileService.setCover(user, parsed.data.choice);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateProfile();
  return { ok: true, cover: result.cover };
}

export async function setSharingAction(
  input: unknown,
): Promise<ActionResult<{ handle: string | null; profilePublic: boolean }>> {
  const user = await requireUser();
  const parsed = setSharingSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await profileService.setSharing(user, parsed.data);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateProfile();
  return {
    ok: true,
    handle: result.handle,
    profilePublic: result.profilePublic,
  };
}
