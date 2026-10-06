"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ReportDialog } from "./report-dialog";

/** A small report button for any piece of shared content. */
export function ReportButton({
  target,
  what,
}: {
  target: {
    type: "GROUP" | "GROUP_ITEM" | "GROUP_TEST" | "USER";
    id: string;
    groupId: string | null;
  };
  what: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Report ${what}`}
        onClick={() => setOpen(true)}
      >
        <Flag aria-hidden />
      </Button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        target={target}
        what={what}
      />
    </>
  );
}
