"use client";

import { CircleCheck, ClipboardCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";

import { PodMark } from "@/components/blocks/pod-cover";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { PodCover } from "@/lib/pods/covers";

import { setTaskDoneAction } from "../actions";
import { groupBySubject } from "../group-subjects";
import { StartTask } from "./start-task";
import { SectionToggle, TaskRow } from "./task-row";

export type TaskKind = "study" | "revise" | "test" | "own";

export type TodayTask = {
  id: string;
  /** Full title, used for labels: "Study Earth Structure (part 1 of 2)". */
  title: string;
  /** The same task inside its topic: "Study · part 1 of 2". */
  step: string;
  subject: string;
  /** Null for full mocks, which cover every subject. */
  subjectId: string | null;
  kind: TaskKind;
  minutes: number;
  done: boolean;
  topicId: string | null;
  topicName: string | null;
  /** Study and revision run as a timed session. */
  timed: boolean;
  /** Check tests and mocks open the test player. */
  test: boolean;
};

const startButton =
  "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-accent-ink transition-colors duration-[120ms] hover:border-transparent hover:bg-accent-soft md:size-9";

const tile =
  "grid size-8 shrink-0 place-items-center rounded-[9px] [&_svg]:size-4";

/** 20 -> "20m", 120 -> "2h", 125 -> "2h 5m". */
function short(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Today's work, by subject. Each subject is one line; the one you are on is open, so the
 * list stays short however full the day is. A tick shows at once and rolls back if saving
 * fails; ticked tasks gather under Done.
 */
export function TodayTasks({
  tasks,
  covers,
}: {
  tasks: TodayTask[];
  /** Each subject pod's cover, by subject id. */
  covers: Record<string, PodCover>;
}) {
  const reduceMotion = useReducedMotionConfig();
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(
    tasks,
    (state, change: { id: string; done: boolean }) =>
      state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)),
  );
  const subjects = groupBySubject(shown.filter((t) => !t.done));
  const done = shown.filter((t) => t.done);
  const doneIn = (subject: string) =>
    done.filter((t) => t.subject === subject).length;
  // The first subject left is open by default, so finishing one opens the next.
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [showDone, setShowDone] = useState(false);

  const toggleDone = (id: string, isDone: boolean) =>
    start(async () => {
      setShown({ id, done: isDone });
      const result = await setTaskDoneAction({ taskId: id, done: isDone });
      if (!result.ok) toast.error(result.error);
    });

  const transition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <Card className="divide-y divide-border overflow-hidden">
      <AnimatePresence initial={false}>
        {subjects.map((group, index) => {
          const open = opened[group.subject] ?? index === 0;
          const subjectId = group.tasks[0]!.subjectId;
          const cover = subjectId ? covers[subjectId] : undefined;
          const finished = doneIn(group.subject);
          return (
            <motion.section
              key={group.subject}
              aria-label={group.subject}
              layout={!reduceMotion}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <SectionToggle
                open={open}
                onToggle={() =>
                  setOpened((o) => ({ ...o, [group.subject]: !open }))
                }
                title={group.subject}
                lead={
                  cover ? (
                    <PodMark cover={cover} name={group.subject} size="sm" />
                  ) : (
                    <span className={`${tile} bg-surface-muted text-ink-muted`}>
                      <ClipboardCheck aria-hidden />
                    </span>
                  )
                }
                progress={
                  finished > 0
                    ? (finished / (finished + group.tasks.length)) * 100
                    : null
                }
                meta={
                  <>
                    {group.tasks.length} left ·{" "}
                    <span className="font-mono">{short(group.minutes)}</span>
                  </>
                }
              />
              {open ? (
                <div className="px-1.5 pb-1.5">
                  <AnimatePresence initial={false}>
                    {group.tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout={!reduceMotion}
                        exit={{ opacity: 0, x: 12 }}
                        transition={transition}
                      >
                        <TaskRow
                          task={task}
                          onDoneChange={toggleDone}
                          action={
                            <StartTask task={task} className={startButton} />
                          }
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : null}
            </motion.section>
          );
        })}
      </AnimatePresence>

      {done.length > 0 ? (
        <motion.section
          aria-label="Done"
          layout={!reduceMotion}
          transition={transition}
        >
          <SectionToggle
            open={showDone}
            onToggle={() => setShowDone((s) => !s)}
            title="Done today"
            lead={
              <span className={`${tile} bg-success-soft text-success-ink`}>
                <CircleCheck aria-hidden />
              </span>
            }
            meta={<span className="font-mono">{done.length}</span>}
          />
          {showDone ? (
            <div className="px-1.5 pb-1.5">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} onDoneChange={toggleDone} />
              ))}
            </div>
          ) : null}
        </motion.section>
      ) : null}
    </Card>
  );
}
