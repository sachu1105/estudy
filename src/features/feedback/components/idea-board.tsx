"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { IdeaStatus } from "@/lib/feedback/schemas";
import { useHydrated } from "@/lib/use-hydrated";

import type { IdeaItem } from "../types";
import { IdeaRow } from "./idea-row";
import { SuggestIdea } from "./suggest-idea";

type Filter = "open" | "planned" | "shipped" | "mine";
const FILTERS: Filter[] = ["open", "planned", "shipped", "mine"];

const IN: Record<Exclude<Filter, "mine">, IdeaStatus[]> = {
  open: ["OPEN"],
  planned: ["PLANNED", "BUILDING"],
  shipped: ["SHIPPED"],
};

const EMPTY: Record<Filter, { title: string; description: string }> = {
  open: {
    title: "No ideas open for votes",
    description: "Be the first. Tell us what would make studying here easier.",
  },
  planned: {
    title: "Nothing planned yet",
    description:
      "Back the ideas you'd use. The most wanted ones get planned first.",
  },
  shipped: {
    title: "Nothing shipped from here yet",
    description: "Ideas you back land here once they're built.",
  },
  mine: {
    title: "No ideas from you yet",
    description:
      "Suggest one. You'll see here when the team reads it and what they decide.",
  },
};

const inFilter = (idea: IdeaItem, filter: Filter) =>
  filter === "mine" ? idea.mine : IN[filter].includes(idea.status);

/** The ideas people want, most wanted first, and the button to add one. */
export function IdeaBoard({ ideas }: { ideas: IdeaItem[] }) {
  const hydrated = useHydrated();
  // A notification links to #idea-<id>: that idea opens, in the filter that holds it.
  const linked = hydrated
    ? ideas.find((i) => `#idea-${i.id}` === window.location.hash)
    : undefined;
  const home = linked && FILTERS.find((f) => inFilter(linked, f));
  const [picked, setFilter] = useState<Filter | null>(null);
  const filter = picked ?? home ?? "open";
  const focus = picked ? null : (linked?.id ?? null);

  useEffect(() => {
    if (!focus) return;
    document
      .getElementById(`idea-${focus}`)
      ?.scrollIntoView({ block: "center" });
  }, [focus]);

  const shown = ideas.filter((i) => inFilter(i, filter));
  const count = (f: Filter) => ideas.filter((i) => inFilter(i, f)).length;
  const label = (text: string, f: Filter) => (
    <>
      {text}
      <span className="hidden font-mono text-micro text-ink-subtle tabular-nums sm:inline">
        {count(f)}
      </span>
    </>
  );

  return (
    <section aria-label="Ideas" className="flex flex-col gap-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SegmentedControl
            className="w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
            ariaLabel="Show ideas"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "open", label: label("Open", "open") },
              { value: "planned", label: label("Planned", "planned") },
              { value: "shipped", label: label("Shipped", "shipped") },
              { value: "mine", label: label("Mine", "mine") },
            ]}
          />
        </div>
        <SuggestIdea
          ideas={ideas.filter(
            (i) => i.status === "OPEN" || i.status === "PLANNED",
          )}
          onSent={() => setFilter("mine")}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Lightbulb} {...EMPTY[filter]} />
      ) : (
        <ul
          aria-label={`${filter} ideas`}
          className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        >
          {shown.map((idea) => (
            <IdeaRow
              key={idea.id === focus ? `${idea.id}-focus` : idea.id}
              idea={idea}
              open={idea.id === focus}
            />
          ))}
        </ul>
      )}
      {filter === "open" && shown.length > 0 ? (
        <p className="text-small text-ink-muted">
          Tap the arrow on the ideas you&apos;d use. The most wanted get planned
          first.
        </p>
      ) : null}
    </section>
  );
}
