import { Flame } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

export type RankRowProps = {
  rank: number;
  name: string;
  avatarUrl: string | null;
  exam: string | null;
  xp: number;
  streak: number;
  you?: boolean;
};

/** One place on a leaderboard. Numbers in mono; the viewer's own row is marked. */
export function RankRow({
  rank,
  name,
  avatarUrl,
  exam,
  xp,
  streak,
  you,
}: RankRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 px-3 py-2",
        you && "bg-accent-soft",
      )}
      aria-current={you ? "true" : undefined}
    >
      <span className="w-10 shrink-0 text-right font-mono text-body text-ink-muted tabular-nums">
        {rank}
      </span>
      <Avatar name={name} src={avatarUrl ?? undefined} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-body",
            you && "font-medium text-accent-ink",
          )}
        >
          {name}
          {you ? " (you)" : ""}
        </span>
        {exam ? (
          <span className="truncate text-small text-ink-muted">{exam}</span>
        ) : null}
      </span>
      {streak > 0 ? (
        <span
          className="flex items-center gap-0.5 text-small text-streak-ink"
          aria-label={`${streak} day streak`}
        >
          <Flame className="size-3.5 fill-current text-streak" aria-hidden />
          <span className="font-mono tabular-nums">{streak}</span>
        </span>
      ) : null}
      <span className="w-16 shrink-0 text-right font-mono text-body tabular-nums">
        {xp.toLocaleString("en-IN")}
        <span className="sr-only"> XP</span>
      </span>
    </div>
  );
}
