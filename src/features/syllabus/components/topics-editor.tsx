"use client";

import { Combine, Plus } from "lucide-react";
import { Reorder } from "motion/react";
import { useState, type Dispatch } from "react";

import { Button } from "@/components/ui/button";
import type { EditableSubject } from "@/lib/syllabus/tree";

import type { TreeAction } from "../tree-reducer";
import { TopicEditor } from "./topic-editor";

/** A folder's topics in edit mode: rename, drag to reorder, rate, merge, add, delete. */
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
      <Reorder.Group
        axis="y"
        values={subject.topics}
        onReorder={(topics) =>
          dispatch({
            type: "reorderTopics",
            subjectId,
            ids: topics.map((t) => t.id),
          })
        }
        className="flex flex-col gap-2"
      >
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
      </Reorder.Group>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
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
        {chosen.length >= 2 ? (
          <Button
            variant="secondary"
            onClick={() => {
              dispatch({ type: "mergeTopics", subjectId, topicIds: chosen });
              setSelected([]);
            }}
          >
            <Combine aria-hidden /> Merge {chosen.length} topics
          </Button>
        ) : null}
      </div>
    </div>
  );
}
