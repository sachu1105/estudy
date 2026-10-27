import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { materialService } from "@/server/services/groups";

const bodySchema = z.object({
  groupId: z.uuid(),
  channelId: z.uuid(),
  files: z
    .array(
      z.object({
        contentType: z.string().max(100),
        size: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(10),
});

// Presigned PUTs for photos or a PDF sent from a device into a squad chat. The service
// checks the sender may post in that channel; nothing is shared until the message is
// sent and the bytes are checked.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Choose up to 10 photos, or one PDF." },
      { status: 400 },
    );
  const limited = await rateLimit([["uploadSignPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const { groupId, channelId, files } = body.data;
  const result = await materialService.requestChatUploads(
    user,
    groupId,
    channelId,
    files,
  );
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({ uploads: result.uploads });
});
