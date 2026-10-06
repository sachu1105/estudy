"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toast } from "@/components/ui/toast";

type Replanned =
  | { ok: true; planId: string | null; warning: boolean }
  | { ok: false; error: string };

/**
 * Runs an edit or a re-plan. The plan is re-made, so the page moves to the new plan;
 * when the rest no longer fits, the old plan stays and its warning card shows the options.
 */
export function useReplan() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<Replanned>, done?: string) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return resolve(false);
        }
        if (result.warning) {
          toast.error(
            "The rest of the syllabus no longer fits. Your plan shows the options.",
          );
          router.refresh();
        } else {
          if (done) toast.success(done);
          router.replace(`/plan/${result.planId}`);
        }
        resolve(true);
      }),
    );
  return { run, pending };
}
