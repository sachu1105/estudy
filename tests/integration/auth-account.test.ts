import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { hit } from "@/server/ratelimit/sliding-window";
import { redis } from "@/server/redis";

import { buildAuth, meta, resetDatabase, tokenFromLastEmail } from "./helpers";

const credentials = {
  email: "rahul@example.com",
  password: "first password 1",
  name: "Rahul Menon",
};

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("email verification links", () => {
  it("work once", async () => {
    const auth = buildAuth();
    await auth.account.register(credentials, meta);
    const token = tokenFromLastEmail(auth.mailer);
    expect((await auth.account.verifyEmail(token)).ok).toBe(true);
    expect(await auth.account.verifyEmail(token)).toMatchObject({
      ok: false,
      code: "INVALID_LINK",
    });
  });

  it("expire after 24 hours", async () => {
    const auth = buildAuth();
    await auth.account.register(credentials, meta);
    auth.clock.advance(25 * 60 * 60_000);
    expect(
      await auth.account.verifyEmail(tokenFromLastEmail(auth.mailer)),
    ).toMatchObject({ ok: false });
  });

  it("resend says nothing about whether the account exists", async () => {
    const auth = buildAuth();
    expect(await auth.account.resendVerification("ghost@example.com")).toEqual({
      ok: true,
    });
    expect(auth.mailer.sent).toHaveLength(0);
  });
});

describe("password reset", () => {
  it("changes the password, signs out every device and burns the link", async () => {
    const auth = buildAuth();
    await auth.account.register(credentials, meta);
    await auth.account.verifyEmail(tokenFromLastEmail(auth.mailer));
    const session = await auth.session.login(credentials, meta);
    if (!session.ok) throw new Error(session.message);

    await auth.account.requestPasswordReset(credentials.email, meta);
    const token = tokenFromLastEmail(auth.mailer);
    expect(auth.mailer.sent.at(-1)?.subject).toBe("Reset your password");

    const reset = await auth.account.resetPassword(
      { token, password: "second password 2" },
      meta,
    );
    expect(reset.ok).toBe(true);

    expect((await auth.session.refresh(session.refreshToken, meta)).ok).toBe(
      false,
    );
    expect((await auth.session.login(credentials, meta)).ok).toBe(false);
    expect(
      (
        await auth.session.login(
          { ...credentials, password: "second password 2" },
          meta,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await auth.account.resetPassword(
          { token, password: "third password 3" },
          meta,
        )
      ).ok,
    ).toBe(false);
  });

  it("requesting for an unknown email sends nothing", async () => {
    const auth = buildAuth();
    expect(
      await auth.account.requestPasswordReset("ghost@example.com", meta),
    ).toEqual({ ok: true });
    expect(auth.mailer.sent).toHaveLength(0);
  });
});

describe("changing the password while signed in", () => {
  async function signedIn() {
    const auth = buildAuth();
    const registered = await auth.account.register(credentials, meta);
    if (!registered.ok) throw new Error(registered.message);
    const { userId } = registered;
    await auth.account.verifyEmail(tokenFromLastEmail(auth.mailer));
    const here = await auth.session.login(credentials, meta);
    const elsewhere = await auth.session.login(credentials, meta);
    if (!here.ok || !elsewhere.ok) throw new Error("login failed");
    return { auth, userId, here, elsewhere };
  }

  it("keeps this device signed in and signs out the others", async () => {
    const { auth, userId, here, elsewhere } = await signedIn();
    const result = await auth.account.changePassword(
      {
        userId,
        currentPassword: credentials.password,
        newPassword: "second password 2",
        refreshToken: here.refreshToken,
      },
      meta,
    );
    expect(result.ok).toBe(true);

    expect((await auth.session.refresh(here.refreshToken, meta)).ok).toBe(true);
    expect((await auth.session.refresh(elsewhere.refreshToken, meta)).ok).toBe(
      false,
    );
    expect((await auth.session.login(credentials, meta)).ok).toBe(false);
    expect(
      (
        await auth.session.login(
          { ...credentials, password: "second password 2" },
          meta,
        )
      ).ok,
    ).toBe(true);
  });

  it("needs the current password, and a different new one", async () => {
    const { auth, userId, here } = await signedIn();
    const change = (currentPassword: string, newPassword: string) =>
      auth.account.changePassword(
        {
          userId,
          currentPassword,
          newPassword,
          refreshToken: here.refreshToken,
        },
        meta,
      );
    expect(await change("not my password", "second password 2")).toMatchObject({
      ok: false,
      code: "WRONG_PASSWORD",
    });
    expect(
      await change(credentials.password, credentials.password),
    ).toMatchObject({ ok: false, code: "SAME_PASSWORD" });
    expect((await auth.session.refresh(here.refreshToken, meta)).ok).toBe(true);
  });

  it("burns any reset link that was still open", async () => {
    const { auth, userId, here } = await signedIn();
    await auth.account.requestPasswordReset(credentials.email, meta);
    const token = tokenFromLastEmail(auth.mailer);
    await auth.account.changePassword(
      {
        userId,
        currentPassword: credentials.password,
        newPassword: "second password 2",
        refreshToken: here.refreshToken,
      },
      meta,
    );
    expect(
      (
        await auth.account.resetPassword(
          { token, password: "third 3333" },
          meta,
        )
      ).ok,
    ).toBe(false);
  });
});

describe("audit log", () => {
  it("is append-only at the database level", async () => {
    const auth = buildAuth();
    await auth.account.register(credentials, meta);
    const entry = await prisma.auditLog.findFirstOrThrow();
    await expect(
      prisma.auditLog.update({
        where: { id: entry.id },
        data: { action: "tampered" },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.auditLog.delete({ where: { id: entry.id } }),
    ).rejects.toThrow(/append-only/);
  });
});

describe("sliding-window rate limit", () => {
  it("blocks past the limit and reopens when the window slides", async () => {
    const clock = fixedClock("2026-10-05T04:30:00Z");
    const key = `test:${Date.now()}:${Math.random()}`;
    const rule = { limit: 2, windowMs: 60_000 };

    expect(await hit(redis, clock, key, rule)).toEqual({ ok: true });
    clock.advance(10_000);
    expect(await hit(redis, clock, key, rule)).toEqual({ ok: true });
    const blocked = await hit(redis, clock, key, rule);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBe(50_000);

    clock.advance(61_000);
    expect(await hit(redis, clock, key, rule)).toEqual({ ok: true });
    await redis.del(`rl:${key}`);
  });
});
