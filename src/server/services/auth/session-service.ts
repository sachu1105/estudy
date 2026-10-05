import { verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import {
  generateOpaqueToken,
  hashToken,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
} from "@/server/auth/tokens";

import { fail, normaliseEmail, type AuthDeps, type RequestMeta } from "./deps";

/** A concurrent refresh within this window gets a fresh access token instead of a lockout. */
export const REUSE_GRACE_MS = 10_000;

export function createSessionService(deps: AuthDeps) {
  const { users, refreshTokens, audit, clock, ids, config } = deps;

  async function issueTokens(
    user: { id: string; role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" },
    familyId: string,
    meta: RequestMeta,
  ) {
    const now = clock.now();
    const refreshToken = generateOpaqueToken();
    const row = {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    };
    const accessToken = await signAccessToken(
      { sub: user.id, role: user.role, sid: familyId },
      config.accessSecret,
      now,
    );
    return { accessToken, refreshToken, row };
  }

  async function login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ) {
    const user = await users.findByEmail(normaliseEmail(input.email));
    const valid = user
      ? await verifyPassword(user.passwordHash, input.password)
      : await verifyAgainstDummy(input.password);

    if (!user || !valid) {
      return fail(
        "INVALID_CREDENTIALS",
        "That email and password don't match. Check both and try again.",
      );
    }
    if (user.status !== "ACTIVE") {
      return fail(
        "ACCOUNT_DISABLED",
        "This account is suspended. Contact support to restore it.",
      );
    }
    if (!user.emailVerifiedAt) {
      return fail(
        "EMAIL_NOT_VERIFIED",
        "Verify your email first. Use the link we sent you.",
      );
    }

    const familyId = ids.next();
    const tokens = await issueTokens(user, familyId, meta);
    await refreshTokens.create(tokens.row);
    await audit.append({ actorId: user.id, action: "auth.login", ip: meta.ip });
    return {
      ok: true as const,
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Rotates a refresh token. Reusing a rotated token outside the grace window means it
   * was stolen or replayed, so the whole family (every device of that login) is revoked.
   */
  async function refresh(rawToken: string, meta: RequestMeta) {
    const now = clock.now();
    const current = await refreshTokens.findByHash(hashToken(rawToken));
    if (!current)
      return fail("INVALID", "Your session has ended. Log in again.");

    const user = await users.findById(current.userId);
    if (!user || user.status !== "ACTIVE") {
      await refreshTokens.revokeFamily(current.familyId, now);
      return fail("INVALID", "Your session has ended. Log in again.");
    }

    const graceAccess = async () => ({
      ok: true as const,
      userId: user.id,
      accessToken: await signAccessToken(
        { sub: user.id, role: user.role, sid: current.familyId },
        config.accessSecret,
        now,
      ),
      refreshToken: undefined,
    });

    if (current.revokedAt) {
      // Revoked without a successor (logout, family revoke): simply over, not an attack.
      if (!current.replacedBy)
        return fail("INVALID", "Your session has ended. Log in again.");
      const sinceRevoked = now.getTime() - current.revokedAt.getTime();
      if (sinceRevoked <= REUSE_GRACE_MS) return graceAccess();
      await refreshTokens.revokeFamily(current.familyId, now);
      await audit.append({
        actorId: user.id,
        action: "auth.refresh_reuse_detected",
        targetId: current.familyId,
        ip: meta.ip,
      });
      return fail(
        "REUSE_DETECTED",
        "Your session has ended for your security. Log in again.",
      );
    }
    if (current.expiresAt <= now)
      return fail("INVALID", "Your session has ended. Log in again.");

    const tokens = await issueTokens(user, current.familyId, meta);
    const rotated = await refreshTokens.rotate(current.id, tokens.row, now);
    if (!rotated) return graceAccess(); // lost a race with a concurrent refresh
    return {
      ok: true as const,
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async function logout(rawToken: string | undefined, meta: RequestMeta) {
    if (!rawToken) return;
    const current = await refreshTokens.findByHash(hashToken(rawToken));
    if (!current) return;
    await refreshTokens.revokeFamily(current.familyId, clock.now());
    await audit.append({
      actorId: current.userId,
      action: "auth.logout",
      ip: meta.ip,
    });
  }

  return { login, refresh, logout };
}

export type SessionService = ReturnType<typeof createSessionService>;
