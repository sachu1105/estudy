"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { adoptSyllabusAction } from "../actions";

/** A catalogue syllabus: its subjects become the user's pods. */
export function UseSyllabusButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await adoptSyllabusAction({ versionId });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Your pods are ready");
          router.push(`/pods/exam/${versionId}`);
        })
      }
    >
      {pending ? "Creating pods" : "Use this syllabus"}
    </Button>
  );
}
