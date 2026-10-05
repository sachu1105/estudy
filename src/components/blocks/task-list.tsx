"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotionConfig,
} from "motion/react";
import { useId } from "react";

import { TopicRow } from "./topic-row";

export type TaskListItem = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
};

type TaskListProps = {
  tasks: TaskListItem[];
  onDoneChange: (id: string, done: boolean) => void;
};

// Signature micro-interaction: a ticked row slides down into the done group.
export function TaskList({ tasks, onDoneChange }: TaskListProps) {
  const reduceMotion = useReducedMotionConfig();
  // Scopes layoutIds so two lists on one page never animate into each other.
  const scope = useId();
  const transition = {
    duration: reduceMotion ? 0 : 0.3,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const groups = [
    {
      key: "todo",
      heading: "To do",
      items: tasks.filter((task) => !task.done),
    },
    { key: "done", heading: "Done", items: tasks.filter((task) => task.done) },
  ];

  return (
    <LayoutGroup id={scope}>
      <div className="flex flex-col gap-4">
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <motion.section
              key={group.key}
              layout="position"
              transition={transition}
              aria-label={group.heading}
            >
              <h4 className="mb-1 px-3 text-micro text-ink-subtle uppercase">
                {group.heading} · {group.items.length}
              </h4>
              <AnimatePresence initial={false}>
                {group.items.map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    transition={{
                      ...transition,
                      delay: reduceMotion || !task.done ? 0 : 0.18,
                    }}
                  >
                    <TopicRow
                      title={task.title}
                      subject={task.subject}
                      minutes={task.minutes}
                      done={task.done}
                      onDoneChange={(done) => onDoneChange(task.id, done)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.section>
          ),
        )}
      </div>
    </LayoutGroup>
  );
}
