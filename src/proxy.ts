import { NextResponse, type NextRequest } from "next/server";

import { systemClock } from "@/lib/clock";
import { isId } from "@/lib/ids";
import { LAST_SQUAD_COOKIE } from "@/lib/squads/last-squad";
import {
  ACCESS_COOKIE,
  clearSessionCookies,
  REFRESH_COOKIE,
  writeSessionCookies,
  type SessionTokens,
} from "@/server/auth/cookies";
import { clientIp } from "@/server/auth/ip";
import { verifyAccessToken, type AccessClaims } from "@/server/auth/tokens";
import { env } from "@/server/env";
import { sessionService } from "@/server/services/auth";
import { groupService } from "@/server/services/groups";

// Refreshes tokens and redirects. It is never the only guard (CLAUDE.md rule 9): every
// page, action and route handler still calls requireUser() / requireRole() / withUser().

const PROTECTED = [
  "/today",
  "/plan",
  "/calendar",
  "/syllabus",
  "/pods",
  "/tests",
  "/groups",
  "/settings",
  "/study",
  "/test",
  "/omr",
  "/admin",
  "/notifications",
];
const SIGNED_OUT_ONLY = ["/login", "/register"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const now = systemClock.now();
  const access = await verifyAccessToken(
    request.cookies.get(ACCESS_COOKIE)?.value,
    env.JWT_ACCESS_SECRET,
    now,
  );

  let refreshed: SessionTokens | null = null;
  let sessionEnded = false;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && refreshToken) {
    const result = await sessionService.refresh(refreshToken, {
      ip: clientIp(request.headers),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    if (result.ok)
      refreshed = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    else sessionEnded = true;
  }
  const signedIn = Boolean(access || refreshed);

  const squad =
    signedIn && pathname === "/groups"
      ? await lastSquad(request, access, refreshed)
      : null;

  let response: NextResponse;
  if (!signedIn && matches(pathname, PROTECTED)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(login);
  } else if (signedIn && matches(pathname, SIGNED_OUT_ONLY)) {
    response = NextResponse.redirect(new URL("/today", request.url));
  } else if (squad) {
    // Squads reopens the last squad. Redirecting here, before anything renders, lets
    // the squad's skeleton stream at once; the page's own redirect left a blank screen
    // between the two requests.
    response = NextResponse.redirect(new URL(`/groups/${squad}`, request.url));
  } else {
    // Forward the fresh access token so Server Components in this same request see it.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", `${pathname}${search}`);
    if (refreshed) {
      request.cookies.set(ACCESS_COOKIE, refreshed.accessToken);
      requestHeaders.set("cookie", request.cookies.toString());
    }
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (refreshed) writeSessionCookies(response.cookies, refreshed);
  else if (sessionEnded) clearSessionCookies(response.cookies);
  return response;
}

/** The squad last open, if the person is still in it (else the page picks one). */
async function lastSquad(
  request: NextRequest,
  access: AccessClaims | null,
  refreshed: SessionTokens | null,
) {
  const id = request.cookies.get(LAST_SQUAD_COOKIE)?.value;
  if (!id || !isId(id)) return null;
  const claims =
    access ??
    (refreshed
      ? await verifyAccessToken(
          refreshed.accessToken,
          env.JWT_ACCESS_SECRET,
          systemClock.now(),
        )
      : null);
  if (!claims) return null;
  return (await groupService.stillIn(claims.sub, id)) ? id : null;
}

export const config = {
  // Pages, plus pod files: a note's images are plain <img> requests that can't refresh an
  // expired access token themselves. Other API routes, Next internals and static files
  // are skipped.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
    "/api/pods/files/:path*",
    "/api/groups/files/:path*",
    // Long-lived pages reconnect their stream and poll the bell after the access token
    // has expired; the refresh happens here, like for a page.
    "/api/groups/:groupId/stream",
    "/api/notifications/:path*",
  ],
};
