"use client";

import { HeartHandshake, Lightbulb, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { Chip } from "@/components/ui/chip";
import { toast } from "@/components/ui/toast";

import { reactAction } from "../../discussion-actions";
import type { ReactionTally } from "./types";

const LOOK = {
  LIKE: { icon: ThumbsUp, label: "Like" },
  HELPFUL: { icon: Lightbulb, label: "Helpful" },
  THANKS: { icon: HeartHandshake, label: "Thanks" },
} as const;

/** Like, helpful, thanks: toggled at once, taken back if the server says no. */
export function ReactionBar({
  groupId,
  postId,
  replyId,
  reactions,
}: {
  groupId: string;
  postId: string;
  replyId: string | null;
  reactions: ReactionTally[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [shown, flip] = useOptimistic(
    reactions,
    (state, kind: ReactionTally["kind"]) =>
      state.map((r) =>
        r.kind === kind
          ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) }
          : r,
      ),
  );
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((r) => {
        const { icon: Icon, label } = LOOK[r.kind];
        return (
          <Chip
            key={r.kind}
            selected={r.mine}
            aria-label={`${label}, ${r.count}`}
            onClick={() =>
              start(async () => {
                flip(r.kind);
                const result = await reactAction({
                  groupId,
                  postId,
                  replyId,
                  kind: r.kind,
                  on: !r.mine,
                });
                if (!result.ok) return void toast.error(result.error);
                router.refresh();
              })
            }
          >
            <Icon aria-hidden />
            <span className="font-mono tabular-nums">{r.count || ""}</span>
            <span className="sr-only md:not-sr-only">{label}</span>
          </Chip>
        );
      })}
    </div>
  );
}
