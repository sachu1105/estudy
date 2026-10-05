import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { uploadService } from "@/server/services/syllabus";

const bodySchema = z.object({
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive(),
});

// Step 1 of an upload: a presigned PUT straight to storage. The file never passes through
// this server, and nothing is saved until /complete checks what arrived.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Choose a file to upload." },
      { status: 400 },
    );
  const limited = await rateLimit([["uploadSignPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );

  const result = await uploadService.requestUpload(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({
    key: result.key,
    url: result.url,
    headers: result.headers,
  });
});
