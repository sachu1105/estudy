import { z } from "zod";

/**
 * A profile's own rules, with no server in them: what a handle may look like, how long
 * a bio runs, and how a handle is suggested from a name.
 */

export const BIO_MAX = 160;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

/** Handles live in a URL and are compared lowercase, so they stay plain. */
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/;

/**
 * Words we keep for our own routes and for the obvious impersonations. A handle is a
 * public address, so this list is checked before anything is saved.
 */
const RESERVED = new Set([
  "about",
  "admin",
  "api",
  "app",
  "contact",
  "help",
  "login",
  "logout",
  "me",
  "new",
  "onboarding",
  "pods",
  "pricing",
  "privacy",
  "register",
  "root",
  "settings",
  "signup",
  "staff",
  "studypods",
  "support",
  "team",
  "terms",
  "today",
  "u",
  "user",
  "veraft",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN, `Use at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Use at most ${HANDLE_MAX} characters.`)
  .regex(
    HANDLE_PATTERN,
    "Use lowercase letters, numbers and underscores, starting and ending with a letter or number.",
  )
  .refine((value) => !RESERVED.has(value), "That handle is taken.");

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter the name others see.")
    .max(50, "Use at most 50 characters."),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX, `Use at most ${BIO_MAX} characters.`)
    .transform((value) => value || null)
    .nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * A first guess at a handle from the name someone signed up with: lowercased, anything
 * exotic dropped, padded when it comes out too short. It is only a suggestion; the user
 * can type their own, and the server still checks it is free.
 */
export function suggestHandle(displayName: string, fallback: string) {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX);
  const seed = base.length >= HANDLE_MIN ? base : `study_${fallback}`;
  return seed.slice(0, HANDLE_MAX).replace(/_+$/, "");
}

/** The public address of a profile, for the copy button and for share sheets. */
export function profileUrl(origin: string, handle: string) {
  return `${origin.replace(/\/+$/, "")}/u/${handle}`;
}
