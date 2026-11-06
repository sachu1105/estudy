import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import { omrService } from "@/server/services/omr";

// A question paper, to its owner only (rule 15): an ownership check, then a redirect to
// a storage link that expires in 5 minutes.
export const GET = withUser<RouteContext<"/api/omr/[paperId]/file">>(
  async (_request, user, context) => {
    const { paperId } = await context.params;
    const url = isId(paperId) ? await omrService.viewUrl(user, paperId) : null;
    if (!url)
      return NextResponse.json({ error: "No such paper." }, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  },
);
