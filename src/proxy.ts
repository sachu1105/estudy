import { NextResponse, type NextRequest } from "next/server";

import { systemClock } from "@/lib/clock";
import {
  ACCESS_COOKIE,
  clearSessionCookies,
  REFRESH_COOKIE,
  writeSessionCookies,
  type SessionTokens,
} from "@/server/auth/cookies";
import { clientIp } from "@/server/auth/ip";
import { verifyAccessToken } from "@/server/auth/tokens";
import { env } from "@/server/env";
import { sessionService } from "@/server/services/auth";

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
  "/rank",
  "/progress",
  "/settings",
  "/onboarding",
  "/study",
  "/test",
  "/admin",
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

  let response: NextResponse;
  if (!signedIn && matches(pathname, PROTECTED)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(login);
  } else if (signedIn && matches(pathname, SIGNED_OUT_ONLY)) {
    response = NextResponse.redirect(new URL("/today", request.url));
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

export const config = {
  // Pages, plus pod files: a note's images are plain <img> requests that can't refresh an
  // expired access token themselves. Other API routes, Next internals and static files
  // are skipped.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
    "/api/pods/files/:path*",
  ],
};
