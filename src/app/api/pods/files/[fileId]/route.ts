import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import { fileService } from "@/server/services/pods";

// A pod file, to its owner only (rule 15): an ownership check, then a redirect to a
// storage link that expires in 5 minutes. Notes embed this path, never a storage URL.
export const GET = withUser<RouteContext<"/api/pods/files/[fileId]">>(
  async (_request, user, context) => {
    const { fileId } = await context.params;
    const url = isId(fileId) ? await fileService.viewUrl(user, fileId) : null;
    if (!url)
      return NextResponse.json({ error: "No such file." }, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  },
);
