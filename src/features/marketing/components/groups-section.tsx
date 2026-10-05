import { Check, ClipboardCheck, MessageCircle } from "lucide-react";

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
      aria-label="Preview of a study group with a shared mock test, a discussion and a group rank"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-md sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-h3 font-medium">
            LDC 2026 · Thrissur
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
            Kerala renaissance · 25 questions
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
          <span className="font-medium text-ink">Fathima:</span> Is Vaikom
          Satyagraha 1924 or 1925 in the answer key?{" "}
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

export function GroupsSection() {
  return (
    <section
      id="groups"
      aria-labelledby="groups-title"
      className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeading
            id="groups-title"
            eyebrow="Groups"
            title="Study together, stay accountable"
            align="left"
          >
            Make a group with friends or your coaching batch. Share notes and
            mock tests, ask doubts, and see who studied the most this week.
          </SectionHeading>
          <ul className="mt-6 flex flex-col gap-3 text-body text-ink-muted">
            {[
              "Shared notes, PDFs and mock tests in one place",
              "Ask a doubt, mark the answer that helped",
              "A weekly group rank that resets every Monday",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check
                  className="mt-1 size-4 shrink-0 text-accent"
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal>
          <GroupPreview />
        </Reveal>
      </div>
    </section>
  );
}
