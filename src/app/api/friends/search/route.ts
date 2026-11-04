import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { friendService } from "@/server/services/friends";

// People to add, by name or username, while the person types in Add friend. Only those
// who chose to be found (rule 9: signed in; rule 11: parsed; rule 13: rate limited).
export const GET = withUser(async (request, user) => {
  const q = z
    .string()
    .max(40)
    .safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!q.success)
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const limited = await rateLimit([["friendSearchPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const people = await friendService.search(user, q.data);
  return NextResponse.json(
    { people },
    { headers: { "Cache-Control": "no-store" } },
  );
});
