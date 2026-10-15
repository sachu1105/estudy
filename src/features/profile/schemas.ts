import { z } from "zod";

import { COVER_PRESETS, type CoverPreset } from "@/lib/pods/covers";

const presets = Object.keys(COVER_PRESETS) as [CoverPreset, ...CoverPreset[]];

export const saveProfileSchema = z.object({
  displayName: z.string().max(200),
  bio: z.string().max(1000).nullable(),
});

export const setAvatarSchema = z.object({
  key: z.string().max(200).nullable(),
});

export const setProfileCoverSchema = z.object({
  choice: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("auto") }),
    z.object({ kind: z.literal("gradient"), preset: z.enum(presets) }),
    z.object({ kind: z.literal("image"), key: z.string().max(200) }),
  ]),
});

export const setSharingSchema = z.object({
  profilePublic: z.boolean(),
  handle: z.string().max(100).nullable().optional(),
});

export type ActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };
