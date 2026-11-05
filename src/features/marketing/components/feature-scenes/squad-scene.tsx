import {
  CircleCheck,
  CircleHelp,
  Compass,
  FileText,
  Hash,
  Megaphone,
  MessageCircle,
  Trophy,
  Users,
} from "lucide-react";

import { PodCover } from "@/components/blocks/pod-cover";
import { cn } from "@/lib/utils/cn";

import { Message, PollOption, SquadTile } from "./squad-scene-parts";

// Sample content, not data. A squad open on its chat, laid out like the app (the squad
// rail with Friends on top and each squad in its own art, the channel list under the
// squad's banner, messages) and running off the cell's right and bottom edges.

const channels = [
  { icon: Hash, label: "general", active: true },
  { icon: Hash, label: "doubts", active: false },
  { icon: Hash, label: "papers", active: false },
  { icon: Megaphone, label: "announcements", active: false },
];

export function SquadScene() {
  return (
    <div className="absolute top-0 left-4 flex h-[30rem] w-[44rem] overflow-hidden rounded-tl-[20px] border-t border-l border-border bg-surface shadow-lg sm:left-8 lg:left-12">
      <div className="flex w-16 shrink-0 flex-col items-center gap-2 bg-surface-muted py-3">
        <span className="relative grid size-10 place-items-center rounded-3xl bg-surface text-ink-muted">
          <MessageCircle className="size-[18px]" />
          <span className="absolute -right-1 -bottom-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-surface-muted bg-accent px-1 text-micro font-medium text-on-accent tabular-nums">
            2
          </span>
        </span>
        <span className="h-px w-7 bg-border" />
        <SquadTile initials="ES" preset="blurple" active />
        <SquadTile initials="SC" preset="ocean" />
        <SquadTile initials="LD" preset="meadow" />
        <span className="h-px w-7 bg-border" />
        <span className="grid size-10 place-items-center rounded-3xl bg-surface text-ink-muted">
          <Compass className="size-[18px]" />
        </span>
      </div>

      <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border p-3 sm:flex md:hidden lg:flex">
        <span className="relative -mx-3 -mt-3 mb-2 flex h-16 items-end overflow-hidden px-3 pb-2">
          <PodCover
            cover={{ kind: "gradient", preset: "blurple" }}
            className="absolute inset-0"
          />
          <span className="relative font-heading text-small font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
            Exam squad
          </span>
        </span>
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
