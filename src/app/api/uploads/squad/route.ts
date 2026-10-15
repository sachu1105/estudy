import { NextResponse } from "next/server";
import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { squadCoverService } from "@/server/services/groups";

const bodySchema = z.object({
  groupId: z.uuid(),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

// A presigned PUT for a squad banner. The service checks the caller administers the
// squad; nothing is saved until the action that follows checks the bytes.
export const POST = withUser(async (request, user) => {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Choose one image." }, { status: 400 });
  const limited = await rateLimit([["uploadSignPerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );
  const { groupId, ...file } = body.data;
  const result = await squadCoverService.requestUpload(user, groupId, file);
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
