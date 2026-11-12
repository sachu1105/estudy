import { NextResponse } from "next/server";

import { toView } from "@/features/notifications/view";
import { systemClock } from "@/lib/clock";
import { withUser } from "@/server/auth/route";
import { notificationService } from "@/server/services/notifications";

/** The bell's menu: the latest notifications, fetched each time it opens. */
export const GET = withUser(async (_request, user) => {
  const [items, unread] = await Promise.all([
    notificationService.list(user),
    notificationService.unread(user),
  ]);
  const now = systemClock.now();
  return NextResponse.json(
    { items: items.map((n) => toView(n, now, user.timezone)), unread },
    { headers: { "Cache-Control": "no-store" } },
  );
});
