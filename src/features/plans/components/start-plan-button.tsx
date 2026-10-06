"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { startPlanAction } from "../actions";

/** Opens the exam's plan setup: a new one, or the one already in progress. */
export function StartPlanButton({
  syllabusId,
  label,
  variant = "primary",
}: {
  syllabusId: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await startPlanAction({ syllabusId });
          if (!result.ok) return void toast.error(result.error);
          router.push(`/plan/new/${result.draftId}/timeline`);
        })
      }
    >
      {pending ? "Opening" : label}
    </Button>
  );
}
