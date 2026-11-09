"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { VOTABLE_IDEA } from "@/lib/feedback/schemas";
import { cn } from "@/lib/utils/cn";

import type { IdeaItem } from "../types";
import { IdeaStatusBadge } from "./status-badge";
import { TeamNote } from "./team-note";
import { VoteButton } from "./vote-button";

/** One idea: the vote on the left, the title and a line of detail, more on a tap. */
export function IdeaRow({ idea, open }: { idea: IdeaItem; open?: boolean }) {
  const [expanded, setExpanded] = useState(open ?? false);
  const more = Boolean(idea.body || idea.teamNote);
  const detailId = `idea-${idea.id}-detail`;

  return (
    <li
      id={`idea-${idea.id}`}
      className="flex scroll-mt-24 gap-3 px-4 py-3.5 sm:px-5"
    >
      <VoteButton
        ideaId={idea.id}
        title={idea.title}
        votes={idea.votes}
        voted={idea.voted}
        open={VOTABLE_IDEA.includes(idea.status)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          disabled={!more}
          aria-expanded={more ? expanded : undefined}
          aria-controls={more ? detailId : undefined}
          className="group flex cursor-pointer items-start gap-2 text-left disabled:cursor-default"
        >
          <span className="min-w-0 flex-1 font-heading text-body font-medium wrap-break-word text-ink">
            {idea.title}
          </span>
          {more ? (
            <ChevronDown
              className={cn(
                "mt-1 size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms] group-hover:text-ink-muted",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          ) : null}
        </button>
        {idea.body && !expanded ? (
          <p className="line-clamp-1 text-small text-ink-muted">{idea.body}</p>
        ) : null}
        {expanded ? (
          <div id={detailId} className="flex flex-col gap-2.5">
            {idea.body ? (
              <p className="text-small wrap-break-word whitespace-pre-wrap text-ink-muted">
                {idea.body}
              </p>
            ) : null}
            {idea.teamNote ? <TeamNote note={idea.teamNote} /> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
          {idea.fromTeam ? (
            <Badge tone="accent">
              <Sparkles aria-hidden /> Would you use this?
            </Badge>
          ) : null}
          {idea.status !== "OPEN" ? (
            <IdeaStatusBadge status={idea.status} />
          ) : null}
          <span>{idea.areaLabel}</span>
          <span aria-hidden>·</span>
          <span>
            {idea.fromTeam ? "From the team" : (idea.by ?? "A studypods user")},{" "}
            {idea.when}
          </span>
          {idea.teamNote && !expanded ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-accent-ink">Team replied</span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
