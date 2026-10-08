import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { channelService } from "@/server/services/groups";

// Who a private channel lets in, for the admin's picker (squads S5). Loaded when the
// dialog opens, so the channel list stays cheap. Squad admins only (rule 9).
export const GET = withUser<
  RouteContext<"/api/groups/[groupId]/channels/[channelId]/access">
>(async (_request, user, context) => {
  const params = z
    .object({ groupId: z.uuid(), channelId: z.uuid() })
    .safeParse(await context.params);
  if (!params.success)
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const access = await channelService.access(
    user,
    params.data.groupId,
    params.data.channelId,
  );
  if (!access)
    return NextResponse.json({ error: "No such channel." }, { status: 404 });
  return NextResponse.json(access, {
    headers: { "Cache-Control": "no-store" },
  });
});
