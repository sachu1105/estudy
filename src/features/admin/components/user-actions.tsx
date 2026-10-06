"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  resetStreakAction,
  setUserRoleAction,
  setUserStatusAction,
} from "../actions";
import { GrantPlan } from "./grant-plan";
import { ReasonDialog } from "./reason-dialog";
import { useAdminRun } from "./use-admin-run";

type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
type Status = "ACTIVE" | "SUSPENDED" | "BANNED";

/** What an admin can do to one account. Each change is logged with who and why. */
export function UserActions({
  userId,
  status,
  role,
  plan,
  canRoles,
}: {
  userId: string;
  status: Status;
  role: Role;
  plan: "FREE" | "PRO" | "ELITE";
  canRoles: boolean;
}) {
  const { run, withRefresh, pending } = useAdminRun();
  const [nextRole, setNextRole] = useState(role);
  const setStatus = (next: Status) =>
    withRefresh((reason) =>
      setUserStatusAction({ userId, status: next, reason }),
    );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-h3">Account</h2>
        <div className="flex flex-wrap gap-2">
          {status === "ACTIVE" ? (
            <>
              <ReasonDialog
                trigger="Suspend"
                title="Suspend this account"
                description="They're signed out everywhere and can't sign in until restored."
                confirm="Suspend"
                run={setStatus("SUSPENDED")}
                done="Account suspended"
              />
              <ReasonDialog
                danger
                trigger="Ban"
                title="Ban this account"
                description="For serious abuse. They're signed out everywhere."
                confirm="Ban"
                run={setStatus("BANNED")}
                done="Account banned"
              />
            </>
          ) : (
            <ReasonDialog
              trigger="Restore account"
              title="Restore this account"
              description="They can sign in again."
              confirm="Restore"
              run={setStatus("ACTIVE")}
              done="Account restored"
            />
          )}
          <ReasonDialog
            trigger="Reset streak"
            title="Reset the streak"
            description="For streak abuse. The streak counts again from today; their study history stays."
            confirm="Reset streak"
            run={withRefresh((reason) => resetStreakAction({ userId, reason }))}
            done="Streak reset"
          />
        </div>
      </section>

      <GrantPlan userId={userId} plan={plan} />

      {canRoles ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-h3">Role</h2>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={nextRole}
              onValueChange={(v) => setNextRole(v as Role)}
            >
              <SelectTrigger aria-label="Role" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const).map(
                  (r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace("_", " ").toLowerCase()}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              disabled={pending || nextRole === role}
              onClick={() =>
                run(
                  () => setUserRoleAction({ userId, role: nextRole }),
                  "Role changed",
                )
              }
            >
              Change role
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
