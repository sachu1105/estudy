"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { decideRequestAction } from "../actions";

/** People asking to join a private group, for its admins. */
export function JoinRequests({
  requests,
}: {
  requests: {
    id: string;
    user: { displayName: string; avatarUrl: string | null };
  }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (requests.length === 0) return null;
  const decide = (requestId: string, approve: boolean) =>
    start(async () => {
      const result = await decideRequestAction({ requestId, approve });
      if (!result.ok) return void toast.error(result.error);
      toast.success(approve ? "Let in" : "Declined");
      router.refresh();
    });
  return (
    <section aria-labelledby="requests" className="flex flex-col gap-3">
      <h2 id="requests" className="text-h3">
        Asking to join
      </h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-3 px-3 py-2"
          >
            <Avatar
              name={r.user.displayName}
              src={r.user.avatarUrl ?? undefined}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-body">
              {r.user.displayName}
            </span>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => decide(r.id, true)}
            >
              Let in
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => decide(r.id, false)}
            >
              Decline
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
