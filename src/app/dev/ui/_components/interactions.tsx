"use client";

import { useState } from "react";

import { QuestionCard } from "@/components/blocks/question-card";
import { StreakChip } from "@/components/blocks/streak-chip";
import { TaskList, type TaskListItem } from "@/components/blocks/task-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";

import { Row, Section } from "./section";

const initialTasks: TaskListItem[] = [
  {
    id: "t1",
    title: "Fundamental rights",
    subject: "Indian Constitution",
    minutes: 45,
    done: false,
  },
  {
    id: "t2",
    title: "Rivers of Kerala",
    subject: "Kerala geography",
    minutes: 30,
    done: false,
  },
  {
    id: "t3",
    title: "Percentages",
    subject: "Quantitative aptitude",
    minutes: 25,
    done: false,
  },
];

export function Interactions() {
  const [tasks, setTasks] = useState(initialTasks);
  const [ringKey, setRingKey] = useState(0);
  const [streak, setStreak] = useState({
    days: 12,
    key: null as number | null,
  });
  const coverage = Math.round(
    (tasks.filter((t) => t.done).length / tasks.length) * 100,
  );

  function toggle(id: string, done: boolean) {
    const firstToday = done && tasks.every((t) => !t.done);
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, done } : t)),
    );
    if (firstToday) setStreak((s) => ({ days: s.days + 1, key: Date.now() }));
  }

  return (
    <Section title="Signature micro-interactions">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Today</CardTitle>
            <StreakChip days={streak.days} celebrateKey={streak.key} />
          </div>
          <TaskList tasks={tasks} onDoneChange={toggle} />
        </CardContent>
      </Card>
      <p className="text-small text-ink-muted">
        Tick the first task: the tick draws in, the row slides to Done and the
        flame flickers once.
      </p>

      <Row label="Progress ring fills on mount; number counts up">
        <ProgressRing
          key={`a${ringKey}`}
          value={72}
          label="Syllabus coverage"
        />
        <ProgressRing
          key={`b${ringKey}`}
          value={coverage}
          size={64}
          strokeWidth={6}
          label="Today's tasks"
        />
        <Button size="sm" onClick={() => setRingKey((k) => k + 1)}>
          Replay
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTasks(initialTasks)}
        >
          Reset tasks
        </Button>
      </Row>

      <QuestionCard
        question="Which article of the Indian Constitution abolishes untouchability?"
        options={["Article 14", "Article 17", "Article 21", "Article 32"]}
        correctIndex={1}
        explanation="Article 17 abolishes untouchability and forbids its practice in any form."
      />

      <Row label="Buttons press to 0.98; cards lift 1px on hover">
        <Button variant="primary">Press me</Button>
        <Card interactive className="cursor-pointer p-4">
          <CardTitle>Section mock</CardTitle>
          <CardDescription>Hover to lift</CardDescription>
        </Card>
      </Row>
    </Section>
  );
}
