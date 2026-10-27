import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { chatService } from "@/server/services/groups";

const params = z.object({
  groupId: z.uuid(),
  channelId: z.uuid(),
  q: z.string().trim().min(1).max(100),
});

// Words searched in one chat channel, newest matches first. Members only (rule 9),
// parsed (rule 11).
export const GET = withUser<
  RouteContext<"/api/groups/[groupId]/channels/[channelId]/search">
>(async (request, user, context) => {
  const parsed = params.safeParse({
    ...(await context.params),
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { groupId, channelId, q } = parsed.data;
  const found = await chatService.search(user, groupId, channelId, q);
  if (!found)
    return NextResponse.json({ error: "No such channel." }, { status: 404 });
  return NextResponse.json(found, {
    headers: { "Cache-Control": "no-store" },
  });
});
