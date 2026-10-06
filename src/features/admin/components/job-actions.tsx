"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { jobAction } from "../actions";

/** Retry a failed job, or discard it for good. */
export function JobActions({ queue, jobId }: { queue: string; jobId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: "retry" | "discard") =>
    start(async () => {
      const result = await jobAction({ queue, jobId, action });
      if (!result.ok) return void toast.error(result.error);
      toast.success(action === "retry" ? "Queued again" : "Discarded");
      router.refresh();
    });
  return (
    <span className="flex gap-1">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => run("retry")}
      >
        Retry
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => run("discard")}>
        Discard
      </Button>
    </span>
  );
}
