import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearSessionCookies,
  REFRESH_COOKIE,
  writeSessionCookies,
} from "@/server/auth/cookies";
import { isSameOrigin } from "@/server/auth/csrf";
import { clientIp } from "@/server/auth/ip";
import { env } from "@/server/env";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { sessionService } from "@/server/services/auth";

// Explicit refresh for long-lived client screens (timers, test player). Pages are
// refreshed transparently by proxy.ts. Authenticated by the refresh cookie itself.
export async function POST(request: Request) {
  if (!isSameOrigin(request, env.APP_URL)) {
    return NextResponse.json(
      { error: "Cross-site request blocked." },
      { status: 403 },
    );
  }
  const ip = clientIp(request.headers);
  const limited = await rateLimit([["refreshPerIp", ip]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );

  const store = await cookies();
  const token = store.get(REFRESH_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Log in to continue." }, { status: 401 });

  const result = await sessionService.refresh(token, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });
  if (!result.ok) {
    clearSessionCookies(store);
    return NextResponse.json({ error: result.message }, { status: 401 });
  }
  writeSessionCookies(store, result);
  return NextResponse.json({ ok: true });
}
