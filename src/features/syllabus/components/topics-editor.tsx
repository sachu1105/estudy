"use client";

import { Combine, Plus, X } from "lucide-react";
import { useState, type Dispatch } from "react";

import { Button } from "@/components/ui/button";
import type { EditableSubject } from "@/lib/syllabus/tree";
import { cn } from "@/lib/utils/cn";

import type { TreeAction } from "../tree-reducer";
import { TOPIC_COLUMNS, TopicEditor } from "./topic-editor";

/**
 * A subject's topics in edit mode: rename, rate, mark as basics, merge, add, delete,
 * and move with each topic's menu. Dense rows under one set of headings.
 */
export function TopicsEditor({
  subject,
  dispatch,
}: {
  subject: EditableSubject;
  dispatch: Dispatch<TreeAction>;
}) {
  const subjectId = subject.id;
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = selected.filter((id) =>
    subject.topics.some((t) => t.id === id),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden bg-surface md:rounded-control md:border md:border-border">
        <div
          aria-hidden
          className={cn(
            "hidden border-b border-border bg-surface-muted/60 py-1.5 pr-1 pl-0.5 text-micro text-ink-muted uppercase md:grid md:gap-2",
            TOPIC_COLUMNS,
          )}
        >
          <span />
          <span className="px-2">Topic</span>
          <span>Weight</span>
          <span>Difficulty</span>
          <span>Basics</span>
          <span />
        </div>
        <ul className="divide-y divide-border">
          {subject.topics.map((topic, i) => (
            <TopicEditor
              key={topic.id}
              topic={topic}
              index={i}
              count={subject.topics.length}
              selected={selected.includes(topic.id)}
              onSelect={(on) =>
                setSelected((prev) =>
                  on ? [...prev, topic.id] : prev.filter((x) => x !== topic.id),
                )
              }
              onChange={(patch) =>
                dispatch({
                  type: "updateTopic",
                  subjectId,
                  topicId: topic.id,
                  patch,
                })
              }
              onMove={(delta) =>
                dispatch({
                  type: "moveTopic",
                  subjectId,
                  topicId: topic.id,
                  delta,
                })
              }
              onDelete={() =>
                dispatch({ type: "deleteTopic", subjectId, topicId: topic.id })
              }
            />
          ))}
        </ul>
      </div>
      <Button
        variant="ghost"
        className="ml-1 self-start md:ml-0"
        onClick={() =>
          dispatch({
            type: "addTopic",
            subjectId,
            topicId: crypto.randomUUID(),
          })
        }
      >
        <Plus aria-hidden /> Add topic
      </Button>
      {chosen.length > 0 ? (
        // Picked topics: the action follows you down the list instead of waiting at its end.
        <div
          role="toolbar"
          aria-label="Selected topics"
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-20 flex items-center gap-2 rounded-card border border-border bg-surface p-2 pl-4 shadow-lg md:bottom-4"
        >
          <span className="min-w-0 flex-1 truncate text-small text-ink-muted">
            {chosen.length} selected
            {chosen.length < 2 ? " · pick one more" : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="md:size-9"
            aria-label="Clear selection"
            onClick={() => setSelected([])}
          >
            <X aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={chosen.length < 2}
            onClick={() => {
              dispatch({ type: "mergeTopics", subjectId, topicIds: chosen });
              setSelected([]);
            }}
          >
            <Combine aria-hidden /> Merge {chosen.length} topics
          </Button>
        </div>
      ) : null}
    </div>
  );
}
