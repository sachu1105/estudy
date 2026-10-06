"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { replanAction } from "../actions";
import { useReplan } from "../use-replan";

/** The Sunday re-plan, on demand: rebuilds the days ahead from today's progress. */
export function ReplanButton({ syllabusId }: { syllabusId: string }) {
  const { run, pending } = useReplan();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        run(() => replanAction({ syllabusId }), "Plan re-made from today")
      }
    >
      <RefreshCw aria-hidden /> {pending ? "Re-planning" : "Re-plan now"}
    </Button>
  );
}
