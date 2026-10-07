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

import {
  deletePostAction,
  hidePostAction,
  pinPostAction,
} from "../../discussion-actions";
import { ReportDialog } from "../report-dialog";

/**
 * What the viewer may do with a post or reply: admins pin and hide, authors delete,
 * anyone else reports. The server checks each again.
 */
export function PostMenu({
  groupId,
  postId,
  replyId,
  what,
  admin,
  mine,
  pinned,
  hidden,
}: {
  groupId: string;
  postId: string;
  replyId: string | null;
  what: string;
  admin: boolean;
  mine: boolean;
  pinned?: boolean;
  hidden: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    then?: () => void,
  ) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      if (then) then();
      else router.refresh();
    });
  const target = { groupId, postId, replyId };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={`More for ${what}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {admin && !replyId ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => pinPostAction({ groupId, postId, on: !pinned }),
                  pinned ? "Unpinned" : "Pinned to the top",
                )
              }
            >
              {pinned ? "Unpin" : "Pin to the top"}
            </DropdownMenuItem>
          ) : null}
          {admin ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => hidePostAction({ ...target, on: !hidden }),
                  hidden ? "Shown again" : "Hidden from members",
                )
              }
            >
              {hidden ? "Show again" : "Hide from members"}
            </DropdownMenuItem>
          ) : null}
          {mine ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => deletePostAction(target),
                  "Deleted",
                  replyId
                    ? undefined
                    : () => router.push(`/groups/${groupId}/discuss`),
                )
              }
            >
              Delete
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setReporting(true)}>
              Report
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{
          type: replyId ? "REPLY" : "POST",
          id: replyId ?? postId,
          groupId,
        }}
        what={what}
      />
    </>
  );
}
