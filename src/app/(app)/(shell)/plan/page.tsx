import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

/** Plans live in their exam pods now; with one plan, go straight to it. */
export default async function PlansPage() {
  const user = await requireUser();
  const plans = await planService.listActive(user);
  const exam = plans.length === 1 ? plans[0]!.syllabusVersionId : null;
  redirect(exam ? `/pods/exam/${exam}/plan` : "/pods");
}
