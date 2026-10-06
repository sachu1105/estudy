"use client";

import { MoreHorizontal } from "lucide-react";
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

import { blockUserAction, manageMemberAction } from "../actions";
import { ReportDialog } from "./report-dialog";

type Action =
  | { kind: "remove" }
  | { kind: "mute"; hours: number | null }
  | { kind: "role"; role: "ADMIN" | "MEMBER" };

/**
 * What the viewer may do about one member. The server checks again: admins manage
 * members, the owner manages admins. Anyone can block or report.
 */
export function MemberMenu({
  groupId,
  member,
  canManage,
  canSetRole,
}: {
  groupId: string;
  member: {
    id: string;
    name: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    muted: boolean;
  };
  canManage: boolean;
  canSetRole: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const run = (action: Action, done: string) =>
    start(async () => {
      const result = await manageMemberAction({
        groupId,
        userId: member.id,
        action,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });
  const block = () =>
    start(async () => {
      const result = await blockUserAction({ userId: member.id, on: true });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        `${member.name} is blocked: you won't see what they share.`,
      );
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`More for ${member.name}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSetRole ? (
            member.role === "ADMIN" ? (
              <DropdownMenuItem
                onSelect={() =>
                  run({ kind: "role", role: "MEMBER" }, "No longer an admin")
                }
              >
                Remove admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() =>
                  run({ kind: "role", role: "ADMIN" }, "Made an admin")
                }
              >
                Make admin
              </DropdownMenuItem>
            )
          ) : null}
          {canManage ? (
            <>
              {member.muted ? (
                <DropdownMenuItem
                  onSelect={() => run({ kind: "mute", hours: null }, "Unmuted")}
                >
                  Unmute
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onSelect={() =>
                      run({ kind: "mute", hours: 24 }, "Muted for a day")
                    }
                  >
                    Mute for a day
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      run({ kind: "mute", hours: 24 * 7 }, "Muted for a week")
                    }
                  >
                    Mute for a week
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onSelect={() =>
                  run({ kind: "remove" }, "Removed from the group")
                }
              >
                Remove from group
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={block}>Block</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setReporting(true)}>
            Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{ type: "USER", id: member.id, groupId }}
        what={member.name}
      />
    </>
  );
}
