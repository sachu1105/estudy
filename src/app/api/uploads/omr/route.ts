import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { omrService } from "@/server/services/omr";

const bodySchema = z.object({
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

// A presigned PUT for a question paper. Nothing is saved until /complete checks it.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Choose a PDF." }, { status: 400 });
  const limited = await rateLimit([["uploadSignPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const result = await omrService.requestUpload(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ upload: result.upload });
});
