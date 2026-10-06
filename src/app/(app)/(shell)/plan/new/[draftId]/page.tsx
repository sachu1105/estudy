import { redirect } from "next/navigation";

// The setup starts at its first step.
export default async function PlanSetupPage({
  params,
}: PageProps<"/plan/new/[draftId]">) {
  redirect(`/plan/new/${(await params).draftId}/timeline`);
}
