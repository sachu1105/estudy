"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearSessionCookies,
  REFRESH_COOKIE,
  writeSessionCookies,
} from "@/server/auth/cookies";
import { requestMeta, requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { accountService, sessionService } from "@/server/services/auth";

import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetSchema,
  safeNext,
  verifySchema,
  type ActionResult,
} from "./schemas";

// Public auth actions: there is no user yet, so instead of requireUser() (rule 9) every
// one validates with zod (rule 11) and is rate limited (rule 13).

const invalid: ActionResult = {
  ok: false,
  error: "Check the highlighted fields and try again.",
};

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const { email, password, next } = parsed.data;
  const meta = await requestMeta();

  const limited = await rateLimit([
    ["loginPerIp", meta.ip],
    ["loginPerAccount", email.toLowerCase()],
  ]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  const result = await sessionService.login({ email, password }, meta);
  if (!result.ok)
    return { ok: false, error: result.message, code: result.code };

  writeSessionCookies(await cookies(), result);
  redirect(safeNext(next));
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const meta = await requestMeta();

  const limited = await rateLimit([["registerPerIp", meta.ip]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  const result = await accountService.register(parsed.data, meta);
  if (!result.ok)
    return { ok: false, error: result.message, code: result.code };
  const params = new URLSearchParams({ sent: "1", email: result.email });
  const next = safeNext(parsed.data.next, "");
  if (next) params.set("next", next);
  redirect(`/verify-email?${params.toString()}`);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  await sessionService.logout(
    store.get(REFRESH_COOKIE)?.value,
    await requestMeta(),
  );
  clearSessionCookies(store);
  redirect("/login");
}

export async function verifyEmailAction(input: unknown): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "This link is incomplete. Open it again from the email.",
    };
  const result = await accountService.verifyEmail(parsed.data.token);
  if (!result.ok)
    return { ok: false, error: result.message, code: result.code };
  redirect("/login?verified=1");
}

export async function resendVerificationAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return invalid;
  const meta = await requestMeta();
  const limited = await rateLimit([
    ["resetPerIp", meta.ip],
    ["verifyResendPerAccount", parsed.data.email.toLowerCase()],
  ]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  await accountService.resendVerification(parsed.data.email);
  return {
    ok: true,
    message: "If that account needs verifying, a new link is on its way.",
  };
}

export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return invalid;
  const meta = await requestMeta();
  const limited = await rateLimit([
    ["resetPerIp", meta.ip],
    ["resetPerAccount", parsed.data.email.toLowerCase()],
  ]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  await accountService.requestPasswordReset(parsed.data.email, meta);
  return {
    ok: true,
    message:
      "If an account uses that email, a reset link is on its way. It works for 1 hour.",
  };
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const meta = await requestMeta();
  const limited = await rateLimit([["resetPerIp", meta.ip]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  const result = await accountService.resetPassword(parsed.data, meta);
  if (!result.ok)
    return { ok: false, error: result.message, code: result.code };
  redirect("/login?reset=1");
}

// Signed-in password actions: requireUser() first, like every other app action (rule 9).

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const limited = await rateLimit([["passwordChangePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  const result = await accountService.changePassword(
    {
      userId: user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.password,
      refreshToken: (await cookies()).get(REFRESH_COOKIE)?.value,
    },
    await requestMeta(),
  );
  if (!result.ok)
    return { ok: false, error: result.message, code: result.code };
  return {
    ok: true,
    message: "Password changed. Your other devices are signed out.",
  };
}

/** For a signed-in user who has forgotten the current password: the link goes to them. */
export async function emailMyResetLinkAction(): Promise<ActionResult> {
  const user = await requireUser();
  const meta = await requestMeta();
  const limited = await rateLimit([["resetPerAccount", user.email]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };

  await accountService.requestPasswordReset(user.email, meta);
  return {
    ok: true,
    message: `Reset link sent to ${user.email}. It works for 1 hour.`,
  };
}
