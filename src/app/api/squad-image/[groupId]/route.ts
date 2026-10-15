import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/session";
import { squadCoverService } from "@/server/services/groups";

const paramsSchema = z.object({ groupId: z.uuid() });

type Context = { params: Promise<{ groupId: string }> };

/**
 * Serves a squad's banner by redirecting to a short-lived signed link, so the storage
 * key never reaches the browser. A public squad's banner is open, because the card it
 * sits on is listed in Discover; a private squad's is for its members only.
 */
export async function GET(_request: Request, context: Context) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });

  const viewer = await getCurrentUser();
  const url = await squadCoverService.signedImage(viewer, params.data.groupId);
  if (!url) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
