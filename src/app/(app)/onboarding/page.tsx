import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { StartPlanButton } from "@/features/plans/components/start-plan-button";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";

export const metadata: Metadata = { title: "Get started" };

/** Where "Create your study plan" lands: pick an exam, or add one first. */
export default async function OnboardingPage() {
  const user = await requireUser();
  const { exams } = await podService.exams(user);
  return (
    <>
      <PageHeader
        title="Let's build your plan"
        description={
          exams.length > 0
            ? "Pick the exam to plan for. Next come your exam date, your time and how strong you are in each subject."
            : "First, your exam's syllabus. Pick it from the catalogue or upload the PDF; every subject becomes a pod your plan is built from."
        }
      />
      {exams.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {exams.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4"
            >
              <GraduationCap
                className="size-5 shrink-0 text-ink-muted"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-h3 font-medium break-words">
                  {e.title}
                </span>
                <span className="text-small text-ink-muted">
                  {e.pods.length} subjects
                </span>
              </span>
              <StartPlanButton
                syllabusId={e.id}
                label="Plan this exam"
                variant="secondary"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant={exams.length > 0 ? "secondary" : "primary"}>
          <Link href="/syllabus/catalogue">Pick from the catalogue</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/syllabus/new">Upload a syllabus</Link>
        </Button>
      </div>
    </>
  );
}
