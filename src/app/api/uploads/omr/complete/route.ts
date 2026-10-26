import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { omrService } from "@/server/services/omr";

const bodySchema = z.object({
  key: z.string().max(200),
  name: z.string().max(255),
});

// The browser finished its PUT: check the PDF and make the answer sheet.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "That paper couldn't be added." },
      { status: 400 },
    );
  const limited = await rateLimit([["podWritePerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const result = await omrService.completeUpload(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ sheetId: result.sheetId });
});
