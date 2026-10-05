import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { verifyAccessToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db";

import {
  ACCESS_SECRET,
  buildAuth,
  meta,
  resetDatabase,
  tokenFromLastEmail,
} from "./helpers";

const credentials = {
  email: "Anjali@Example.com",
  password: "correct horse battery",
  name: "Anjali Nair",
};

async function registeredAndVerified(auth: ReturnType<typeof buildAuth>) {
  const registered = await auth.account.register(credentials, meta);
  if (!registered.ok) throw new Error(registered.message);
  await auth.account.verifyEmail(tokenFromLastEmail(auth.mailer));
  return registered;
}

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("register -> verify -> login -> refresh -> reuse detection -> logout", () => {
  it("runs the whole lifecycle", async () => {
    const auth = buildAuth();

    // Register: user is created with a lowercased email and a FREE subscription.
    const registered = await auth.account.register(credentials, meta);
    expect(registered.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "anjali@example.com" },
      include: { subscriptions: true },
    });
    expect(user.passwordHash).not.toContain(credentials.password);
    expect(user.subscriptions.map((s) => s.plan)).toEqual(["FREE"]);
    expect(auth.mailer.sent).toHaveLength(1);

    // Login before verifying is refused.
    const early = await auth.session.login(credentials, meta);
    expect(early).toMatchObject({ ok: false, code: "EMAIL_NOT_VERIFIED" });

    // Verify.
    const verified = await auth.account.verifyEmail(
      tokenFromLastEmail(auth.mailer),
    );
    expect(verified.ok).toBe(true);

    // Login.
    const login = await auth.session.login(credentials, meta);
    if (!login.ok) throw new Error(login.message);
    const claims = await verifyAccessToken(
      login.accessToken,
      ACCESS_SECRET,
      auth.clock.now(),
    );
    expect(claims).toMatchObject({ sub: user.id, role: "USER" });

    // Access token lasts 15 minutes.
    auth.clock.advance(16 * 60_000);
    expect(
      await verifyAccessToken(
        login.accessToken,
        ACCESS_SECRET,
        auth.clock.now(),
      ),
    ).toBeNull();

    // Refresh rotates: a new refresh token, the old one revoked and linked to it.
    const first = await auth.session.refresh(login.refreshToken, meta);
    if (!first.ok || !first.refreshToken) throw new Error("refresh failed");
    expect(first.refreshToken).not.toBe(login.refreshToken);
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      }),
    ).toBe(1);

    // Replaying the old token after the grace window revokes the whole family.
    auth.clock.advance(60_000);
    const replay = await auth.session.refresh(login.refreshToken, meta);
    expect(replay).toMatchObject({ ok: false, code: "REUSE_DETECTED" });
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      }),
    ).toBe(0);
    const stillValid = await auth.session.refresh(first.refreshToken, meta);
    expect(stillValid.ok).toBe(false);
    expect(
      await prisma.auditLog.count({
        where: { action: "auth.refresh_reuse_detected" },
      }),
    ).toBe(1);

    // Log in again, then log out: the family is revoked.
    const again = await auth.session.login(credentials, meta);
    if (!again.ok) throw new Error(again.message);
    await auth.session.logout(again.refreshToken, meta);
    expect((await auth.session.refresh(again.refreshToken, meta)).ok).toBe(
      false,
    );

    const actions = (
      await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })
    ).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "auth.register",
        "auth.email_verified",
        "auth.login",
        "auth.logout",
      ]),
    );
  });
});

describe("refresh", () => {
  it("tolerates a concurrent refresh inside the grace window", async () => {
    const auth = buildAuth();
    await registeredAndVerified(auth);
    const login = await auth.session.login(credentials, meta);
    if (!login.ok) throw new Error(login.message);

    const [a, b] = await Promise.all([
      auth.session.refresh(login.refreshToken, meta),
      auth.session.refresh(login.refreshToken, meta),
    ]);
    expect(a.ok && b.ok).toBe(true);
    // Exactly one of them rotated; the other got an access token only.
    const rotated = [a, b].filter((r) => r.ok && r.refreshToken);
    expect(rotated).toHaveLength(1);
    expect(
      await prisma.auditLog.count({
        where: { action: "auth.refresh_reuse_detected" },
      }),
    ).toBe(0);
  });

  it("rejects refresh tokens after 30 days and for suspended users", async () => {
    const auth = buildAuth();
    const { userId } = await registeredAndVerified(auth);
    const login = await auth.session.login(credentials, meta);
    if (!login.ok) throw new Error(login.message);

    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });
    expect((await auth.session.refresh(login.refreshToken, meta)).ok).toBe(
      false,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });
    const second = await auth.session.login(credentials, meta);
    if (!second.ok) throw new Error(second.message);
    auth.clock.advance(31 * 24 * 60 * 60_000);
    expect((await auth.session.refresh(second.refreshToken, meta)).ok).toBe(
      false,
    );
  });
});

describe("login", () => {
  it("gives the same answer for a wrong password and an unknown email", async () => {
    const auth = buildAuth();
    await registeredAndVerified(auth);
    const wrong = await auth.session.login(
      { ...credentials, password: "wrong password!" },
      meta,
    );
    const unknown = await auth.session.login(
      { ...credentials, email: "nobody@example.com" },
      meta,
    );
    expect(wrong).toEqual(unknown);
    expect(wrong).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
  });

  it("refuses duplicate registration regardless of email case", async () => {
    const auth = buildAuth();
    await registeredAndVerified(auth);
    const again = await auth.account.register(
      { ...credentials, email: "ANJALI@example.com" },
      meta,
    );
    expect(again).toMatchObject({ ok: false, code: "EMAIL_TAKEN" });
  });
});
