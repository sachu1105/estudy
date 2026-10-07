import { notFound, redirect } from "next/navigation";

import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

/**
 * A plan lives in its exam pod's Plan tab. Old links (notifications, bookmarks, a plan a
 * re-plan has since replaced) land there, keeping the week they pointed at.
 */
export default async function PlanPage({
  params,
  searchParams,
}: PageProps<"/plan/[planId]">) {
  const user = await requireUser();
  const { planId } = await params;
  const plan = isId(planId) ? await planService.get(user, planId, 1) : null;
  if (!plan?.syllabusVersionId) notFound();
  const query = await searchParams;
  const keep = new URLSearchParams();
  if (query.new === "1") keep.set("new", "1");
  if (typeof query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.from))
    keep.set("from", query.from);
  const rest = keep.size ? `?${keep}` : "";
  redirect(`/pods/exam/${plan.syllabusVersionId}/plan${rest}`);
}
