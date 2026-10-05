import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import type { JobEvent } from "@/server/realtime/types";
import { jobService } from "@/server/services/syllabus";

// Polling fallback for /api/jobs/[id]/stream.
export const GET = withUser<RouteContext<"/api/jobs/[id]">>(
  async (_request, user, context) => {
    const { id } = await context.params;
    const job = isId(id) ? await jobService.findForUser(id, user.id) : null;
    if (!job)
      return NextResponse.json({ error: "No such job." }, { status: 404 });
    const event: JobEvent = {
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      reused: job.reused,
    };
    return NextResponse.json(event, {
      headers: { "Cache-Control": "no-store" },
    });
  },
);
