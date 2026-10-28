import {
  CircleCheck,
  CircleHelp,
  Compass,
  FileText,
  Hash,
  Megaphone,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// Sample content, not data. A squad open on its chat, laid out like the app (squad rail,
// channel list, messages) and running off the cell's right and bottom edges.

const channels = [
  { icon: Hash, label: "general", active: true },
  { icon: Hash, label: "doubts", active: false },
  { icon: Hash, label: "papers", active: false },
  { icon: Megaphone, label: "announcements", active: false },
];

export function SquadScene() {
  return (
    <div className="absolute top-0 left-4 flex h-[30rem] w-[44rem] overflow-hidden rounded-tl-[20px] border-t border-l border-border bg-surface shadow-lg sm:left-8 lg:left-12">
      <div className="flex w-14 shrink-0 flex-col items-center gap-2 bg-surface-muted py-3">
        <span className="grid size-9 place-items-center rounded-[12px] bg-accent font-heading text-small font-medium text-on-accent">
          ES
        </span>
        <span className="grid size-9 place-items-center rounded-full border border-border bg-surface font-heading text-small text-ink-muted">
          SC
        </span>
        <span className="grid size-9 place-items-center rounded-full border border-border bg-surface text-ink-muted">
          <Compass className="size-4" />
        </span>
      </div>

      <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border p-3 sm:flex md:hidden lg:flex">
        <p className="px-2 pb-2 font-heading text-small font-medium text-ink">
          Exam squad
        </p>
        {channels.map((c) => (
          <span
            key={c.label}
            className={cn(
              "flex items-center gap-2 rounded-chip px-2 py-1.5 text-small",
              c.active ? "bg-accent-soft text-accent-ink" : "text-ink-muted",
            )}
          >
            <c.icon className="size-4 shrink-0" /> {c.label}
          </span>
        ))}
        <span className="mt-2 flex items-center gap-2 rounded-chip px-2 py-1.5 text-small text-ink-muted">
          <Users className="size-4 shrink-0" /> Study room · 4
        </span>
        <span className="flex items-center gap-2 rounded-chip px-2 py-1.5 text-small text-ink-muted">
          <Trophy className="size-4 shrink-0" /> Weekly rank
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 p-4">
        <Message name="Anjali" time="9:12">
          <span className="flex w-60 items-center gap-3 rounded-control border border-border p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-accent-soft text-accent-ink">
              <FileText className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-small font-medium text-ink">
                Fundamental rights.pdf
              </span>
              <span className="text-small text-ink-muted">From my pods</span>
            </span>
          </span>
        </Message>
        <Message name="Rahul" time="9:20">
          <span className="text-small text-ink">Full mock on Saturday?</span>
          <span className="mt-1.5 flex w-60 flex-col gap-1.5">
            <PollOption label="10 am" votes={6} width="w-3/5" />
            <PollOption label="6 pm" votes={3} width="w-1/3" />
          </span>
        </Message>
        <Message name="Fathima" time="9:31">
          <span className="text-small text-ink">
            Is 21A a fundamental right?
          </span>
          <span className="mt-1 flex items-center gap-3 text-small">
            <span className="flex items-center gap-1 font-medium text-ink">
              <CircleHelp className="size-4 text-accent" /> Doubt
            </span>
            <span className="flex items-center gap-1 font-medium text-success">
              <CircleCheck className="size-4" /> Answered
            </span>
          </span>
        </Message>
      </div>
    </div>
  );
}

function Message({
  name,
  time,
  children,
}: {
  name: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted font-heading text-small font-medium text-ink-muted">
        {name[0]}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="text-small">
          <span className="font-medium text-ink">{name}</span>{" "}
          <span className="font-mono text-ink-muted">{time}</span>
        </p>
        {children}
      </div>
    </div>
  );
}

function PollOption({
  label,
  votes,
  width,
}: {
  label: string;
  votes: number;
  width: string;
}) {
  return (
    <span className="relative flex items-center justify-between overflow-hidden rounded-chip border border-border px-2.5 py-1.5 text-small">
      <span className={cn("absolute inset-y-0 left-0 bg-accent-soft", width)} />
      <span className="relative text-ink">{label}</span>
      <span className="relative font-mono text-ink-muted tabular-nums">
        {votes}
      </span>
    </span>
  );
}
