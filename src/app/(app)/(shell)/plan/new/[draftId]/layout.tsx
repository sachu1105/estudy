import { PageHeader } from "@/components/shell/page-header";
import { BackLink } from "@/features/pods/components/back-link";
import { PlanStepper } from "@/features/plans/components/plan-stepper";
import { loadDraft } from "@/features/plans/load-draft";

/** The plan setup: four steps, each its own route, a stepper on top. */
export default async function PlanSetupLayout({
  params,
  children,
}: LayoutProps<"/plan/new/[draftId]">) {
  const { draftId } = await params;
  const draft = await loadDraft(draftId);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink
        href={`/pods/exam/${draft.syllabus.id}`}
        label={draft.syllabus.title}
      />
      <PageHeader
        title="Create study plan"
        description={`For ${draft.syllabus.title}. Everything saves as you go.`}
      />
      <PlanStepper draftId={draft.id} />
      {children}
    </div>
  );
}
