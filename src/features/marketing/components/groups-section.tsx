import {
  ClipboardCheck,
  FolderOpen,
  MessageCircle,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

import { SectionHeading } from "./section-heading";

const members = ["AN", "RM", "FS", "JK", "SV"];
const top3 = [
  ["#1", "Anjali N", "1,240"],
  ["#2", "Rahul M", "1,105"],
  ["#3", "Fathima S", "980"],
];

function Initials({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border-2 border-surface bg-surface-muted font-heading text-micro font-medium text-ink-muted",
        className,
      )}
    >
      {text}
    </span>
  );
}

function GroupPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of a study squad with a shared mock test, a discussion and a squad rank"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-md sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-h3 font-medium">
            Prelims 2026 · Evening batch
          </p>
          <p className="text-small text-ink-muted">18 members</p>
        </div>
        <div className="flex">
          {members.map((m, i) => (
            <Initials
              key={m}
              text={m}
              className={i > 0 ? "-ml-2" : undefined}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-control border border-border p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
          <ClipboardCheck className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-medium">
            Modern history · 25 questions
          </p>
          <p className="text-small text-ink-muted">
            Shared by Rahul · 9 attempts
          </p>
        </div>
        <Badge tone="outline">Mock test</Badge>
      </div>

      <div className="flex gap-3 rounded-control bg-surface-muted p-3">
        <MessageCircle
          className="mt-0.5 size-4 shrink-0 text-ink-muted"
          aria-hidden
        />
        <p className="text-small text-ink-muted">
          <span className="font-medium text-ink">Fathima:</span> Is the Dandi
          March 1930 or 1931 in the answer key?{" "}
          <span className="text-ink-muted">· 3 answers</span>
        </p>
      </div>

      <ol className="flex flex-col gap-1">
        {top3.map(([rank, name, xp]) => (
          <li key={rank} className="flex items-center gap-3 px-1 text-small">
            <span className="w-6 font-mono text-ink-muted">{rank}</span>
            <span className="flex-1 text-ink">{name}</span>
            <span className="font-mono text-ink-muted tabular-nums">
              {xp} XP
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const features = [
  {
    icon: FolderOpen,
    title: "Share from your pods",
    body: "Send a note, PDF or link to the squad in one tap. Only what you share leaves your pod.",
  },
  {
    icon: ClipboardCheck,
    title: "Mock tests together",
    body: "Build a test for the squad and see everyone's score when they finish.",
  },
  {
    icon: MessageCircle,
    title: "Ask a doubt",
    body: "Post a question, get answers live, and mark the one that helped.",
  },
  {
    icon: Trophy,
    title: "A weekly squad rank",
    body: "Ranked by this week's study. It starts fresh every Monday.",
  },
];

export function GroupsSection() {
  return (
    <section
      id="groups"
      aria-labelledby="groups-title"
      className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24"
    >
      <Reveal>
        <SectionHeading
          id="groups-title"
          eyebrow="Squads"
          title="Study together, stay accountable"
        >
          Make a squad with friends or your coaching batch, or join an open one
          for your exam with a code or a link.
        </SectionHeading>
      </Reveal>
      <div className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Reveal className="flex flex-col justify-center rounded-[24px] border border-border bg-surface-muted/60 p-3 sm:p-5">
          <GroupPreview />
        </Reveal>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f.title}>
              <Reveal className="flex h-full flex-col gap-3 rounded-[20px] border border-border bg-surface p-5">
                <span className="grid size-10 place-items-center rounded-control bg-accent-soft text-accent-ink">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3>{f.title}</h3>
                <p className="text-small text-ink-muted">{f.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
