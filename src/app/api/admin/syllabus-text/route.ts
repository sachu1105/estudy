import { NextResponse } from "next/server";

import { canAdmin } from "@/lib/admin/access";
import { withUser } from "@/server/auth/route";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import {
  extractText,
  ParseInputError,
  sniffKind,
} from "@/server/services/syllabus/extract";
import { UPLOAD_MAX_BYTES } from "@/server/services/syllabus/upload-service";

// The admin's syllabus builder: the text layer of a PDF or Word file, handed back so the
// admin can check and trim it before the rules read it. No AI, nothing stored.
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
    if (!(file instanceof File))
      return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    if (file.size > UPLOAD_MAX_BYTES)
      return NextResponse.json(
        { error: "This file is over 15 MB. Upload only the syllabus pages." },
        { status: 413 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffKind(bytes);
    if (kind !== "PDF" && kind !== "DOCX")
      return NextResponse.json(
        {
          error:
            "Upload a PDF or a Word file (.docx) with selectable text, or paste the text.",
        },
        { status: 415 },
      );
    try {
      return NextResponse.json({ text: await extractText(kind, bytes) });
    } catch (error) {
      if (error instanceof ParseInputError)
        return NextResponse.json({ error: error.message }, { status: 422 });
      throw error;
    }
  },
  { roles: ["ADMIN", "SUPER_ADMIN"] },
);
