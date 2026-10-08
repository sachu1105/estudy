import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { chatService } from "@/server/services/groups";

const query = z.object({
  before: z.uuid().optional(),
  after: z.uuid().optional(),
});

// A page of a chat channel (squads S3): older messages when scrolling up, or what's new
// after a live event (which carries ids only). Members only (rule 9), parsed (rule 11).
export const GET = withUser<
  RouteContext<"/api/groups/[groupId]/channels/[channelId]/messages">
>(async (request, user, context) => {
  const { groupId, channelId } = await context.params;
  const ids = z.object({ groupId: z.uuid(), channelId: z.uuid() });
  const url = new URL(request.url);
  const params = ids.safeParse({ groupId, channelId });
  const cursor = query.safeParse({
    before: url.searchParams.get("before") ?? undefined,
    after: url.searchParams.get("after") ?? undefined,
  });
  if (
    !params.success ||
    !cursor.success ||
    (cursor.data.before && cursor.data.after)
  )
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const page = await chatService.page(user, groupId, channelId, cursor.data);
  if (!page)
    return NextResponse.json({ error: "No such channel." }, { status: 404 });
  return NextResponse.json(page, {
    headers: { "Cache-Control": "no-store" },
  });
});
