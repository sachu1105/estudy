"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { deleteGroupAction, leaveGroupAction } from "../actions";
import { ReportDialog } from "./report-dialog";

/** Leave, delete (owner) or report the group. */
export function GroupMenu({
  groupId,
  name,
  owner,
}: {
  groupId: string;
  name: string;
  owner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const run = (action: typeof leaveGroupAction, done: string) =>
    start(async () => {
      const result = await action({ groupId });
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.push("/groups");
    });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`More for ${name}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {owner ? (
            <DropdownMenuItem
              onSelect={() => run(deleteGroupAction, "Group deleted")}
            >
              Delete group
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => run(leaveGroupAction, "You left the group")}
            >
              Leave group
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setReporting(true)}>
            Report group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{ type: "GROUP", id: groupId, groupId }}
        what="this group"
      />
    </>
  );
}
