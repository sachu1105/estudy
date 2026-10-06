import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { fileService } from "@/server/services/pods";

const bodySchema = z.object({
  files: z
    .array(
      z.object({
        contentType: z.string().max(100),
        size: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(20),
});

// Presigned PUTs for pod files. Nothing is saved until /complete checks what arrived.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Choose up to 20 files." },
      { status: 400 },
    );
  const limited = await rateLimit([["uploadSignPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const result = await fileService.requestUploads(user, body.data.files);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ uploads: result.uploads });
});
