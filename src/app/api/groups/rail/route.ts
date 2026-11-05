import { NextResponse } from "next/server";

import { withUser } from "@/server/auth/route";
import { dmService, friendService } from "@/server/services/friends";
import { chatService } from "@/server/services/groups";

// The rail's marks, asked for on each move between squads: the rail itself stays put
// (it lives in the Squads layout), so this keeps its unread dots and the Friends count
// current. The person's own counts only (rule 9).
export const GET = withUser(async (_request, user) => {
  const [unread, dms, requests] = await Promise.all([
    chatService.squadsWithUnread(user),
    dmService.unreadTotal(user),
    friendService.incomingCount(user),
  ]);
  return NextResponse.json(
    { unread: [...unread], friends: dms + requests },
    { headers: { "Cache-Control": "no-store" } },
  );
});
