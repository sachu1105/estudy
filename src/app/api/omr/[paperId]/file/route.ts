import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { clientIp } from "@/server/auth/ip";
import { withUser } from "@/server/auth/route";
import { omrService } from "@/server/services/omr";

// A question paper (rule 15). Its owner is sent to a storage link that expires in 5
// minutes. Anyone else who may open it (a bundle, the Store, a squad exam) gets a
// personal copy stamped with their name, email, IP and the time, never the file.
export const GET = withUser<RouteContext<"/api/omr/[paperId]/file">>(
  async (request, user, context) => {
    const { paperId } = await context.params;
    const file = isId(paperId)
      ? await omrService.paperFile(user, paperId, {
          name: user.name || user.displayName || "studypods user",
          email: user.email,
          ip: clientIp(request.headers),
          timeZone: user.timezone,
        })
      : null;
    if (!file)
      return NextResponse.json({ error: "No such paper." }, { status: 404 });
    if (file.kind === "link")
      return NextResponse.redirect(file.url, {
        status: 302,
        headers: { "Cache-Control": "private, no-store" },
      });
    return new NextResponse(Buffer.from(file.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        // Shown in the page, not offered as a download.
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
