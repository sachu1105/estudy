import { NextResponse } from "next/server";
import { z } from "zod";

import { isId } from "@/lib/ids";
import { OMR_PENS } from "@/lib/omr/ink";
import { withUser } from "@/server/auth/route";
import { omrService } from "@/server/services/omr";

const query = z.object({ pen: z.enum(OMR_PENS).catch("black") });

// The marked answer sheet as a PDF, to its owner only (rule 15), drawn fresh each time.
export const GET = withUser<RouteContext<"/api/omr/[paperId]/answers">>(
  async (request, user, context) => {
    const { paperId } = await context.params;
    const { pen } = query.parse({
      pen: new URL(request.url).searchParams.get("pen"),
    });
    const pdf = isId(paperId)
      ? await omrService.answerPdf(user, paperId, {
          pen,
          timeZone: user.timezone,
        })
      : null;
    if (!pdf)
      return NextResponse.json({ error: "No such paper." }, { status: 404 });
    const name = `${pdf.title.replaceAll("_", " ")} answer sheet.pdf`;
    // Older browsers read the plain name; the rest read the full one, in any script.
    const ascii =
      name.replace(/[^\x20-\x7e]|["\\]/g, "").trim() || "answer sheet.pdf";
    return new NextResponse(new Uint8Array(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
