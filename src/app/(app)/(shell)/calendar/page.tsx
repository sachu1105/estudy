import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

/**
 * The calendar is now the month view of each exam's plan, inside its pod. Old links
 * land there, or on the pods home when there is more than one plan to choose from.
 */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const user = await requireUser();
  const plans = await planService.listActive(user);
  const exam = plans.length === 1 ? plans[0]!.syllabusVersionId : null;
  if (!exam) redirect("/pods");
  const { month } = await searchParams;
  const keep =
    typeof month === "string" && /^\d{4}-\d{2}$/.test(month)
      ? `&month=${month}`
      : "";
  redirect(`/pods/exam/${exam}/plan?view=month${keep}`);
}
