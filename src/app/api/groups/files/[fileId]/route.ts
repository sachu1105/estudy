import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import { materialService } from "@/server/services/groups";

// A file shared in a group, to its members only: a membership check, then a storage link
// that expires in 5 minutes (rule 15). Shared notes embed this path.
export const GET = withUser<RouteContext<"/api/groups/files/[fileId]">>(
  async (_request, user, context) => {
    const { fileId } = await context.params;
    const url = isId(fileId)
      ? await materialService.fileUrl(user, fileId)
      : null;
    if (!url)
      return NextResponse.json({ error: "No such file." }, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  },
);
