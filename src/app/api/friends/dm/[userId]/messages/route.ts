import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { dmService } from "@/server/services/friends";

// A page of a direct chat: the latest messages after a live event, or older ones when
// scrolling up. Only the two people in it (rule 9, rule 15), parsed (rule 11).
export const GET = withUser<RouteContext<"/api/friends/dm/[userId]/messages">>(
  async (request, user, context) => {
    const { userId } = await context.params;
    const url = new URL(request.url);
    const parsed = z
      .object({ userId: z.uuid(), before: z.uuid().nullable() })
      .safeParse({ userId, before: url.searchParams.get("before") });
    if (!parsed.success)
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    const chat = await dmService.open(user, parsed.data.userId);
    if (!chat)
      return NextResponse.json({ error: "No such chat." }, { status: 404 });
    const page = await dmService.page(
      user,
      parsed.data.userId,
      parsed.data.before,
    );
    return NextResponse.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  },
);
