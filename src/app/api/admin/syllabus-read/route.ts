import { NextResponse } from "next/server";
import { z } from "zod";

import { canAdmin } from "@/lib/admin/access";
import { requestMeta } from "@/server/auth/session";
import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { catalogueReadService } from "@/server/services/syllabus";
import { UPLOAD_MAX_BYTES } from "@/server/services/syllabus/upload-service";

const fields = z.object({
  examId: z.uuid("Pick the exam this syllabus is for."),
  title: z.string().trim().min(2, "Give it a title.").max(200),
  text: z
    .string()
    .max(200_000, "That's more text than a syllabus usually has.")
    .nullable(),
});

// The admin's syllabus builder, read by the AI: the file itself (or the text) is stored and
// read by the worker, like a user's upload. Refused while the admin AI switch is off.
export const POST = withUser(
  async (request, user) => {
    if (!canAdmin(user.role, "exams"))
      return NextResponse.json(
        { error: "You don't have access to this." },
        { status: 403 },
      );
    const limited = await rateLimit([["parsePerUser", user.id]]);
    if (!limited.ok)
      return NextResponse.json(
        { error: retryMessage(limited.retryAfterMs) },
        { status: 429 },
      );
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const text = form?.get("text");
    const parsed = fields.safeParse({
      examId: form?.get("examId"),
      title: form?.get("title"),
      text: typeof text === "string" && text ? text : null,
    });
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 },
      );
    if (file instanceof File && file.size > UPLOAD_MAX_BYTES)
      return NextResponse.json(
        { error: "This file is over 15 MB. Upload only the syllabus pages." },
        { status: 413 },
      );
    const { ip } = await requestMeta();
    const result = await catalogueReadService.start(
      { id: user.id, ip },
      {
        ...parsed.data,
        file:
          file instanceof File
            ? {
                name: file.name.slice(0, 200),
                bytes: new Uint8Array(await file.arrayBuffer()),
              }
            : null,
      },
    );
    if (!result.ok)
      return NextResponse.json({ error: result.message }, { status: 422 });
    return NextResponse.json({ id: result.id, reused: result.reused });
  },
  { roles: ["ADMIN", "SUPER_ADMIN"] },
);
