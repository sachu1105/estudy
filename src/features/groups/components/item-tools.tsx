"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { removeGroupItemAction } from "../actions";
import { ReportDialog } from "./report-dialog";

/** Remove (the sharer or a group admin) and report, for one shared item. */
export function ItemTools({
  groupId,
  itemId,
  canRemove,
}: {
  groupId: string;
  itemId: string;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {canRemove ? (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await removeGroupItemAction({ groupId, itemId });
              if (!result.ok) return void toast.error(result.error);
              toast.success("Removed from the squad");
              router.push(`/groups/${groupId}`);
            })
          }
        >
          Remove from squad
        </Button>
      ) : null}
      <Button variant="ghost" onClick={() => setReporting(true)}>
        Report
      </Button>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{ type: "GROUP_ITEM", id: itemId, groupId }}
        what="this item"
      />
    </div>
  );
}
