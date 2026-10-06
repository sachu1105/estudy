"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toast } from "@/components/ui/toast";

type Result = { ok: true } | { ok: false; error: string };

/** Runs an admin action, says how it went, and refreshes the page's data. */
export function useAdminRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<Result>, done: string) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });
  /** For ReasonDialog, which shows its own toasts. */
  const withRefresh =
    (action: (reason: string) => Promise<Result>) => async (reason: string) => {
      const result = await action(reason);
      if (result.ok) router.refresh();
      return result;
    };
  return { run, withRefresh, pending };
}
