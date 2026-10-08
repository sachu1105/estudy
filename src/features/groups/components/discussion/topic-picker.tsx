"use client";

import { ChevronDown, Hash, X } from "lucide-react";

import { ItemPicker } from "@/components/blocks/item-picker";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const NONE = "none";

/**
 * The topic a question is about, picked from the person's syllabus topics. There can
 * be hundreds, so it's a searchable list rather than a dropdown.
 */
export function TopicPicker({
  id,
  topics,
  value,
  onChange,
}: {
  id: string;
  topics: string[];
  /** "none" when no topic is picked. */
  value: string;
  onChange: (topic: string) => void;
}) {
  const picked = value !== NONE;
  return (
    <ItemPicker
      align="start"
      trigger={
        <button
          id={id}
          type="button"
          className={cn(
            fieldClasses,
            "flex h-11 cursor-pointer items-center justify-between gap-2 text-left md:h-10",
            !picked && "text-ink-subtle",
          )}
        >
          <span className="truncate">{picked ? value : "No topic"}</span>
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
        </button>
      }
      title="Pick a topic"
      description="From your syllabus. It helps others find and answer the question."
      empty="Your pods have no topics yet. Add a syllabus to tag questions."
      items={[
        { id: NONE, title: "No topic", icon: <X /> },
        ...topics.map((t) => ({ id: t, title: t, icon: <Hash /> })),
      ]}
      onPick={onChange}
    />
  );
}
