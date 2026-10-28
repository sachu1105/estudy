"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type BuiltTest = {
  title: string;
  topics: string[];
  count: number;
  minutes: number | null;
};

/**
 * A test from the verified pool: a name, the topics, how many questions, how long. Used
 * by the tests channel's dialog and by the chat's attach panel.
 */
export function BuildTestForm({
  topics,
  pending,
  onSubmit,
}: {
  topics: string[];
  pending: boolean;
  onSubmit: (test: BuiltTest) => void;
}) {
  const [title, setTitle] = useState("Weekly test");
  const [filter, setFilter] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [count, setCount] = useState("20");
  const [minutes, setMinutes] = useState("15");
  const shown = topics
    .filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 60);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="test-title">Name</Label>
        <Input
          id="test-title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="test-topics">Topics ({chosen.length} picked)</Label>
        {topics.length ? (
          <>
            <Input
              id="test-topics"
              value={filter}
              placeholder="Filter your topics"
              onChange={(e) => setFilter(e.target.value)}
            />
            <ul className="flex max-h-48 flex-col overflow-y-auto rounded-control border border-border">
              {shown.map((t) => (
                <li key={t}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 hover:bg-surface-muted">
                    <Checkbox
                      checked={chosen.includes(t)}
                      onCheckedChange={(v) =>
                        setChosen((c) =>
                          v === true ? [...c, t] : c.filter((x) => x !== t),
                        )
                      }
                    />
                    <span className="text-body">{t}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-small text-ink-muted">
            No topics yet. Add an exam to your pods, and its topics show up
            here.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium">Questions</span>
          <SegmentedControl
            ariaLabel="Questions"
            value={count}
            onValueChange={setCount}
            size="sm"
            options={["10", "20", "30"].map((v) => ({ value: v, label: v }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium">Time</span>
          <SegmentedControl
            ariaLabel="Time"
            value={minutes}
            onValueChange={setMinutes}
            size="sm"
            options={[
              { value: "0", label: "Untimed" },
              { value: "15", label: "15 min" },
              { value: "30", label: "30 min" },
            ]}
          />
        </div>
      </div>
      <Button
        variant="primary"
        className="self-end"
        disabled={pending || chosen.length === 0}
        onClick={() =>
          onSubmit({
            title,
            topics: chosen,
            count: Number(count),
            minutes: minutes === "0" ? null : Number(minutes),
          })
        }
      >
        Share test
      </Button>
    </div>
  );
}
