import { StatCell, StatStrip } from "@/components/blocks/stat-strip";
import { PageHeader } from "@/components/shell/page-header";
import { BackLink } from "@/features/pods/components/back-link";
import { ExamMenu } from "@/features/pods/components/exam-menu";
import { ExamPlanCta } from "@/features/pods/components/exam-plan-cta";
import { ExamTabs } from "@/features/pods/components/exam-tabs";
import { loadExam } from "@/features/pods/load-exam";
import { toDay } from "@/lib/plan-engine";
import { progressService } from "@/server/services/progress";

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

/**
 * The exam pod: one place for the whole exam. The header and its numbers stay put while
 * the tabs below switch between the subjects board, the plan and the syllabus.
 */
export default async function ExamPodLayout({
  params,
  children,
}: LayoutProps<"/pods/exam/[syllabusId]">) {
  const { syllabusId } = await params;
  const { user, exam, plan } = await loadExam(syllabusId);
  const today = progressService.today(user);

  const percent = exam.topics
    ? Math.round((exam.topicsDone / exam.topics) * 100)
    : 0;
  const subjects = exam.pods.length;
  const studying = exam.pods.filter((p) => p.stage === "STUDYING").length;
  const daysLeft =
    plan.kind === "active"
      ? Math.max(0, toDay(plan.endDate) - toDay(today) + 1)
      : null;

  return (
    <>
      <BackLink href="/pods" label="Pods" />
      <PageHeader
        title={exam.title}
        description={
          exam.examName && exam.examName !== exam.title
            ? exam.examName
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {plan.kind === "active" ? null : (
              <ExamPlanCta syllabusId={exam.id} draft={plan.kind === "draft"} />
            )}
            <ExamMenu
              examId={exam.id}
              title={exam.title}
              subjects={subjects}
              items={exam.items}
              ownUpload={exam.editable}
              hasPlan={plan.kind === "active"}
            />
          </div>
        }
      />

      <StatStrip className="-mt-2 mb-6">
        <StatCell
          label="Topics done"
          value={`${exam.topicsDone}/${exam.topics}`}
          hint={`${percent}% of the syllabus`}
          bar={percent}
        />
        <StatCell
          label="Subjects"
          value={subjects}
          hint={studying > 0 ? `${studying} studying now` : "None started yet"}
        />
        <StatCell
          label="Material"
          value={exam.items}
          hint={exam.items === 1 ? "Item in your pods" : "Items in your pods"}
        />
        {plan.kind === "active" ? (
          <StatCell
            label="Days left"
            value={daysLeft!}
            hint={`Plan ends ${shortDate(plan.endDate)}`}
          />
        ) : (
          <StatCell
            label="Plan"
            value="–"
            hint={plan.kind === "draft" ? "Setup in progress" : "Not made yet"}
          />
        )}
      </StatStrip>

      <ExamTabs examId={exam.id} editable={exam.editable} />
      {children}
    </>
  );
}
