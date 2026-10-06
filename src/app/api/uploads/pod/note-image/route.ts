import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { fileService } from "@/server/services/pods";

const bodySchema = z.object({ itemId: z.uuid(), key: z.string().max(200) });

// An uploaded image placed inside a note.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "No image." }, { status: 400 });
  const limited = await rateLimit([["podWritePerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const result = await fileService.attachToNote(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ src: result.src });
});
