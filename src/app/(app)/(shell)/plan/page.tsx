import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

/**
 * Plans live in their exam pods now. With several, the focus exam's is the one meant, so
 * this goes there rather than dropping the user at the pods hub to pick.
 */
export default async function PlansPage() {
  const user = await requireUser();
  const roles = await planService.roles(user);
  const exam = roles.find((r) => r.focus) ?? roles[0];
  redirect(exam ? `/pods/exam/${exam.examId}/plan` : "/pods");
}
