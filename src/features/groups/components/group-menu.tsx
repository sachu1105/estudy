"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { deleteGroupAction, leaveGroupAction } from "../actions";
import { CategoryDialog } from "./channels/category-dialog";
import { ChannelDialog } from "./channels/channel-dialog";
import { ReportDialog } from "./report-dialog";

/** Admins add channels and categories and invite; anyone leaves or reports; the owner deletes. */
export function GroupMenu({
  groupId,
  name,
  owner,
  canManage = false,
  categories = [],
}: {
  groupId: string;
  name: string;
  owner: boolean;
  canManage?: boolean;
  categories?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const [addingChannel, setAddingChannel] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
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
          {canManage ? (
            <>
              <DropdownMenuItem onSelect={() => setAddingChannel(true)}>
                Add a channel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAddingCategory(true)}>
                Add a category
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/groups/${groupId}/members`}>Invite people</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/groups/${groupId}/settings`}>Squad settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {owner ? (
            <DropdownMenuItem
              onSelect={() => run(deleteGroupAction, "Squad deleted")}
            >
              Delete squad
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => run(leaveGroupAction, "You left the squad")}
            >
              Leave squad
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setReporting(true)}>
            Report squad
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {addingChannel ? (
        <ChannelDialog
          groupId={groupId}
          categories={categories}
          open={addingChannel}
          onOpenChange={setAddingChannel}
        />
      ) : null}
      {addingCategory ? (
        <CategoryDialog
          groupId={groupId}
          open={addingCategory}
          onOpenChange={setAddingCategory}
        />
      ) : null}
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{ type: "GROUP", id: groupId, groupId }}
        what="this squad"
      />
    </>
  );
}
