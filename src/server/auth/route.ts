import "server-only";

import { NextResponse } from "next/server";

import { env } from "@/server/env";

import { isSameOrigin } from "./csrf";
import { getCurrentUser, type Role, type SessionUser } from "./session";

type Handler<Ctx> = (
  request: Request,
  user: SessionUser,
  context: Ctx,
) => Promise<Response>;

function problem(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler with the rule 9 checks: CSRF for unsafe methods, a signed-in
 * active user, and optionally a role. Route handlers return 401/403 instead of redirecting.
 */
export function withUser<Ctx = unknown>(
  handler: Handler<Ctx>,
  options: { roles?: Role[] } = {},
) {
  return async (request: Request, context: Ctx) => {
    if (!isSameOrigin(request, env.APP_URL))
      return problem(403, "Cross-site request blocked.");
    const user = await getCurrentUser();
    if (!user) return problem(401, "Log in to continue.");
    if (options.roles && !options.roles.includes(user.role)) {
      return problem(403, "You don't have access to this.");
    }
    return handler(request, user, context);
  };
}
