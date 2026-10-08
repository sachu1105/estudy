"use client";

import { Button } from "@/components/ui/button";

import { decideReportAction } from "../actions";
import { useAdminRun } from "./use-admin-run";

/** Hide the reported content, or dismiss the reports as unfounded. */
export function ReportDecision({
  type,
  id,
  canHide,
}: {
  type: "GROUP" | "GROUP_ITEM" | "GROUP_TEST" | "USER" | "POST" | "REPLY" | "MESSAGE";
  id: string;
  canHide: boolean;
}) {
  const { run, pending } = useAdminRun();
  return (
    <span className="flex flex-wrap gap-2">
      {canHide ? (
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            run(() => decideReportAction({ type, id, hide: true }), "Hidden")
          }
        >
          Hide it
        </Button>
      ) : null}
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(() => decideReportAction({ type, id, hide: false }), "Dismissed")
        }
      >
        Dismiss
      </Button>
    </span>
  );
}
