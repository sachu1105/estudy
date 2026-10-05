import { NextResponse } from "next/server";

import { uploadCompleteSchema } from "@/features/syllabus/schemas";
import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { uploadService } from "@/server/services/syllabus";

// Step 2: the browser finished its PUT. The server checks size and real file type, hashes
// the bytes, and either reuses an identical file's parse or queues a parse job.
export const POST = withUser(async (request, user) => {
  const body = uploadCompleteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success)
    return NextResponse.json(
      { error: "Give the syllabus a title." },
      { status: 400 },
    );
  const limited = await rateLimit([["parsePerUser", user.id]]);
  if (!limited.ok)
    return NextResponse.json(
      { error: retryMessage(limited.retryAfterMs) },
      { status: 429 },
    );

  const result = await uploadService.completeUpload(user, body.data);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 422 },
    );
  return NextResponse.json({
    versionId: result.versionId,
    jobId: result.jobId,
  });
});
