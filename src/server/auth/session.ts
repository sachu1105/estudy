import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { systemClock } from "@/lib/clock";
import { env } from "@/server/env";
import { loadSettings } from "@/server/settings";
import {
  userRepository,
  type SessionUser,
} from "@/server/repositories/user-repository";

import { ACCESS_COOKIE } from "./cookies";
import { clientIp } from "./ip";
import { verifyAccessToken } from "./tokens";

export type Role = SessionUser["role"];
export type { SessionUser };

/**
 * The signed-in user for this request, or null. The access token proves identity; the
 * user row is re-read so suspensions and role changes apply within the same request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const claims = await verifyAccessToken(
    store.get(ACCESS_COOKIE)?.value,
    env.JWT_ACCESS_SECRET,
    systemClock.now(),
  );
  if (!claims) return null;
  // Admin settings (limits, billing switch) ride along with every signed-in request.
  const [user] = await Promise.all([
    userRepository.findSessionUser(claims.sub),
    loadSettings(),
  ]);
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

async function currentPath() {
  const store = await headers();
  return store.get("x-pathname") ?? "/today";
}

/**
 * Cheap "is someone signed in?" for public pages: checks the access token only, no DB
 * read. Never use it to authorize anything; that is what requireUser() is for.
 */
export async function hasSession() {
  const store = await cookies();
  return Boolean(
    await verifyAccessToken(
      store.get(ACCESS_COOKIE)?.value,
      env.JWT_ACCESS_SECRET,
      systemClock.now(),
    ),
  );
}

/** Guard for pages and server actions (CLAUDE.md rule 9). Redirects to login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
  return user;
}

/** Like requireUser, and the user must hold one of `roles`. Others land on /today. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/today");
  return user;
}

export async function requestMeta() {
  const store = await headers();
  return {
    ip: clientIp(store),
    userAgent: store.get("user-agent")?.slice(0, 300) ?? null,
  };
}
