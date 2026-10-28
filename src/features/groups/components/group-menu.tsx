"use client";

import { ChevronDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils/cn";

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
import { addSubjectChannelsAction } from "../channel-actions";
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
  subjects = [],
  asName = false,
}: {
  groupId: string;
  name: string;
  owner: boolean;
  canManage?: boolean;
  categories?: { id: string; name: string }[];
  subjects?: string[];
  /** Open from the squad's name on its banner, as in Discord, not a "more" button. */
  asName?: boolean;
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
          {asName ? (
            <button
              type="button"
              aria-label={`More for ${name}`}
              disabled={pending}
              className={cn(
                "group/name flex min-h-11 min-w-0 cursor-pointer items-center gap-1 rounded-control px-2 text-left font-heading text-h3 font-medium text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]",
                "transition-colors duration-[120ms] hover:bg-black/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none data-[state=open]:bg-black/20",
              )}
            >
              <span className="truncate">{name}</span>
              <ChevronDown
                className="size-4 shrink-0 transition-transform duration-[200ms] group-data-[state=open]/name:rotate-180"
                aria-hidden
              />
            </button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`More for ${name}`}
              disabled={pending}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={asName ? "start" : "end"}>
          {canManage ? (
            <>
              <DropdownMenuItem onSelect={() => setAddingChannel(true)}>
                Add a channel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAddingCategory(true)}>
                Add a category
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  start(async () => {
                    const result = await addSubjectChannelsAction({ groupId });
                    if (!result.ok) return void toast.error(result.error);
                    toast.success(
                      result.added
                        ? `Added ${result.added} subject channel${result.added === 1 ? "" : "s"}`
                        : "Every subject already has a channel",
                    );
                    router.refresh();
                  })
                }
              >
                A channel per subject
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
          subjects={subjects}
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
