import { hashPassword, verifyPassword } from "@/server/auth/password";
import { generateOpaqueToken, hashToken } from "@/server/auth/tokens";
import {
  passwordResetEmail,
  verificationEmail,
} from "@/server/email/templates";

import { fail, normaliseEmail, type AuthDeps, type RequestMeta } from "./deps";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function createAccountService(deps: AuthDeps) {
  const { users, refreshTokens, oneTimeTokens, audit, mailer, clock, config } =
    deps;

  async function sendVerification(user: {
    id: string;
    email: string;
    name: string;
  }) {
    const token = generateOpaqueToken();
    const expiresAt = new Date(clock.now().getTime() + VERIFY_TTL_MS);
    await oneTimeTokens.createVerification({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });
    const url = `${config.appUrl}/verify-email?token=${token}`;
    await mailer.send(verificationEmail(user.email, user.name, url));
    return token;
  }

  async function register(
    input: { email: string; password: string; name: string; timezone?: string },
    meta: RequestMeta,
  ) {
    const email = normaliseEmail(input.email);
    if (await users.findByEmail(email)) {
      return fail(
        "EMAIL_TAKEN",
        "An account with this email already exists. Log in instead.",
      );
    }
    const name = input.name.trim();
    const user = await users.create({
      email,
      passwordHash: await hashPassword(input.password),
      name,
      displayName: name.split(/\s+/)[0] ?? name,
      timezone: input.timezone ?? config.defaultTimezone,
    });
    await audit.append({
      actorId: user.id,
      action: "auth.register",
      ip: meta.ip,
    });
    const verificationToken = await sendVerification(user);
    return { ok: true as const, userId: user.id, email, verificationToken };
  }

  async function resendVerification(emailInput: string) {
    const user = await users.findByEmail(normaliseEmail(emailInput));
    // Same answer whether or not the account exists, so this can't be used to probe emails.
    if (user && !user.emailVerifiedAt && user.status === "ACTIVE")
      await sendVerification(user);
    return { ok: true as const };
  }

  async function verifyEmail(token: string) {
    const now = clock.now();
    const row = await oneTimeTokens.findVerification(hashToken(token));
    if (!row || row.usedAt || row.expiresAt <= now) {
      return fail(
        "INVALID_LINK",
        "This link has expired or was already used. Request a new one below.",
      );
    }
    if (!(await oneTimeTokens.consumeVerification(row.id, now))) {
      return fail(
        "INVALID_LINK",
        "This link was already used. Log in to continue.",
      );
    }
    await users.markEmailVerified(row.userId, now);
    await audit.append({ actorId: row.userId, action: "auth.email_verified" });
    return { ok: true as const, userId: row.userId };
  }

  async function requestPasswordReset(emailInput: string, meta: RequestMeta) {
    const user = await users.findByEmail(normaliseEmail(emailInput));
    if (user && user.status === "ACTIVE") {
      const now = clock.now();
      await oneTimeTokens.expireOpenResets(user.id, now);
      const token = generateOpaqueToken();
      await oneTimeTokens.createReset({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + RESET_TTL_MS),
      });
      await mailer.send(
        passwordResetEmail(
          user.email,
          user.name,
          `${config.appUrl}/reset-password?token=${token}`,
        ),
      );
      await audit.append({
        actorId: user.id,
        action: "auth.password_reset_requested",
        ip: meta.ip,
      });
    }
    return { ok: true as const };
  }

  async function resetPassword(
    input: { token: string; password: string },
    meta: RequestMeta,
  ) {
    const now = clock.now();
    const row = await oneTimeTokens.findReset(hashToken(input.token));
    if (
      !row ||
      row.usedAt ||
      row.expiresAt <= now ||
      !(await oneTimeTokens.consumeReset(row.id, now))
    ) {
      return fail(
        "INVALID_LINK",
        "This reset link has expired or was already used. Request a new one.",
      );
    }
    await users.updatePassword(row.userId, await hashPassword(input.password));
    await oneTimeTokens.expireOpenResets(row.userId, now);
    // A new password signs out every device.
    await refreshTokens.revokeAllForUser(row.userId, now);
    await audit.append({
      actorId: row.userId,
      action: "auth.password_reset",
      ip: meta.ip,
    });
    return { ok: true as const };
  }

  /**
   * A signed-in change, so it needs the current password rather than an emailed link.
   * Every other device signs out; the one making the change stays signed in.
   */
  async function changePassword(
    input: {
      userId: string;
      currentPassword: string;
      newPassword: string;
      refreshToken?: string;
    },
    meta: RequestMeta,
  ) {
    const user = await users.findById(input.userId);
    if (!user || user.status !== "ACTIVE")
      return fail("INVALID", "Your session has ended. Log in again.");
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      return fail(
        "WRONG_PASSWORD",
        "That isn't your current password. Check it, or email yourself a reset link.",
      );
    }
    if (input.currentPassword === input.newPassword) {
      return fail(
        "SAME_PASSWORD",
        "That is already your password. Choose a new one.",
      );
    }

    const now = clock.now();
    await users.updatePassword(user.id, await hashPassword(input.newPassword));
    await oneTimeTokens.expireOpenResets(user.id, now);
    const current = input.refreshToken
      ? await refreshTokens.findByHash(hashToken(input.refreshToken))
      : null;
    if (current && current.userId === user.id)
      await refreshTokens.revokeAllForUserExcept(user.id, current.familyId, now);
    else await refreshTokens.revokeAllForUser(user.id, now);
    await audit.append({
      actorId: user.id,
      action: "auth.password_changed",
      ip: meta.ip,
    });
    return { ok: true as const };
  }

  return {
    register,
    resendVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
