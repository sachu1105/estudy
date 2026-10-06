import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { fileService } from "@/server/services/pods";

const bodySchema = z.object({
  podId: z.uuid(),
  keys: z
    .array(z.object({ key: z.string().max(200), name: z.string().max(255) }))
    .min(1)
    .max(20),
  asDocument: z.boolean().default(false),
  title: z.string().trim().min(1).max(120).nullable().default(null),
  topicIds: z.array(z.uuid()).max(300).default([]),
});

// The browser finished its PUTs: check the files and turn them into pod items.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Those files couldn't be added." },
      { status: 400 },
    );
  const limited = await rateLimit([["podWritePerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const result = await fileService.completeUploads(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ itemIds: result.itemIds });
});
