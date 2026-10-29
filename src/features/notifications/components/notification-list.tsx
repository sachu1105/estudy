"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

import { markReadAction } from "../actions";

export type NotificationView = {
  id: string;
  text: string;
  subject: string;
  href: string;
  when: string;
  unread: boolean;
  actor: { displayName: string; avatarUrl: string | null } | null;
  /** A report for a squad's staff: nobody is named, so a flag stands in for a face. */
  report?: boolean;
};

/** The inbox. Opening one marks it read; "Mark all read" clears the rest at once. */
export function NotificationList({ items }: { items: NotificationView[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [shown, markShown] = useOptimistic(items, (state, id: string | null) =>
    state.map((n) =>
      id === null || n.id === id ? { ...n, unread: false } : n,
    ),
  );
  const anyUnread = shown.some((n) => n.unread);

  const open = (n: NotificationView) =>
    start(async () => {
      if (n.unread) {
        markShown(n.id);
        await markReadAction({ id: n.id });
      }
      router.push(n.href);
    });

  return (
    <div className="flex flex-col gap-3">
      {anyUnread ? (
        <Button
          variant="secondary"
          className="self-end"
          onClick={() =>
            start(async () => {
              markShown(null);
              const result = await markReadAction({ id: null });
              if (!result.ok) return void toast.error(result.error);
              router.refresh();
            })
          }
        >
          Mark all read
        </Button>
      ) : null}
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {shown.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                n.unread && "bg-accent-soft/50",
              )}
            >
              {n.report ? (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted">
                  <Flag className="size-3.5" aria-hidden />
                </span>
              ) : (
                <Avatar
                  name={n.actor?.displayName ?? "?"}
                  src={n.actor?.avatarUrl ?? undefined}
                  size="sm"
                  className="mt-0.5"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body wrap-break-word">
                  {n.text} <span className="font-medium">{n.subject}</span>
                </span>
                <span className="text-small text-ink-muted">{n.when}</span>
              </span>
              {n.unread ? (
                <span className="mt-2 flex items-center">
                  <span className="size-2 rounded-full bg-accent" aria-hidden />
                  <span className="sr-only">Unread</span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
