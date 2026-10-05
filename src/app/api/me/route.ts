import { NextResponse } from "next/server";

import { withUser } from "@/server/auth/route";
import { planOf } from "@/server/entitlements";

// The signed-in user's own profile. Never exposes other users or password data.
export const GET = withUser(async (_request, user) =>
  NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.displayName,
    role: user.role,
    timezone: user.timezone,
    beginnerMode: user.beginnerMode,
    plan: planOf(user),
  }),
);
