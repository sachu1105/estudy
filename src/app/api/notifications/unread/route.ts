import { NextResponse } from "next/server";

import { withUser } from "@/server/auth/route";
import { notificationService } from "@/server/services/notifications";

/** The bell's count. Polled while the tab is visible; no stream for this. */
export const GET = withUser(async (_request, user) =>
  NextResponse.json(
    { count: await notificationService.unread(user) },
    { headers: { "Cache-Control": "no-store" } },
  ),
);
