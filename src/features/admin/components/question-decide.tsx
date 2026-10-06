"use client";

import { Button } from "@/components/ui/button";

import { decideQuestionsAction } from "../actions";
import { useAdminRun } from "./use-admin-run";

type Decision = "VERIFIED" | "SUPPRESSED" | "DELETE";

const LABEL: Record<Decision, [string, string]> = {
  VERIFIED: ["Verify", "Verified"],
  SUPPRESSED: ["Take out of tests", "Taken out of tests"],
  DELETE: ["Delete", "Deleted"],
};

/** Verify, suppress or delete one question, or a whole page of them. */
export function QuestionDecide({
  ids,
  decisions,
  all = false,
}: {
  ids: string[];
  decisions: Decision[];
  all?: boolean;
}) {
  const { run, pending } = useAdminRun();
  return (
    <span className="flex flex-wrap gap-2">
      {decisions.map((d) => (
        <Button
          key={d}
          variant={
            d === "DELETE" ? "danger" : d === "VERIFIED" ? "secondary" : "ghost"
          }
          disabled={pending}
          onClick={() =>
            run(() => decideQuestionsAction({ ids, decision: d }), LABEL[d][1])
          }
        >
          {all ? `${LABEL[d][0]} all ${ids.length}` : LABEL[d][0]}
        </Button>
      ))}
    </span>
  );
}
