import { z } from "zod";

// Shared by the forms (client-side validation) and the server actions (rule 11).

const email = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .max(254, "That email is too long.")
  .pipe(z.email("Enter an email like name@example.com."));

const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().max(500).optional(),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Use 80 characters or fewer."),
  email,
  password: newPassword,
  timezone: z.string().max(64).optional(),
});

export const emailOnlySchema = z.object({ email });

export const verifySchema = z.object({ token: z.string().min(20).max(200) });

export const resetSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type ResetInput = z.infer<typeof resetSchema>;

export type ActionResult =
  { ok: true; message?: string } | { ok: false; error: string; code?: string };

/** Only same-site relative paths, so `?next=` can't be used for open redirects. */
export function safeNext(next: string | undefined | null, fallback = "/today") {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  )
    return fallback;
  return next;
}
