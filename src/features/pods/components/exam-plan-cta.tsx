"use client";

import { usePathname } from "next/navigation";

import { StartPlanButton } from "@/features/plans/components/start-plan-button";

/**
 * "Create study plan" in the exam header, the one step a new exam pod needs. Hidden on
 * the Plan tab, whose own invitation carries it (one primary button per view).
 */
export function ExamPlanCta({
  syllabusId,
  draft,
}: {
  syllabusId: string;
  draft: boolean;
}) {
  const pathname = usePathname();
  if (pathname.endsWith("/plan")) return null;
  return (
    <StartPlanButton
      syllabusId={syllabusId}
      label={draft ? "Continue setting up" : "Create study plan"}
    />
  );
}
