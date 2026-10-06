"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";

import { saveQuestionAction } from "../actions";
import { OptionFields } from "./option-fields";
import { useAdminRun } from "./use-admin-run";

export type QuestionDraft = {
  topicName: string;
  difficulty: number;
  language: "EN" | "ML";
  body: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  sourceRef: string | null;
};

const EMPTY: QuestionDraft = {
  topicName: "",
  difficulty: 3,
  language: "EN",
  body: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: null,
  sourceRef: null,
};

/** Write or fix one question. An admin's question is verified as it's saved. */
export function QuestionForm({
  id,
  initial,
}: {
  id?: string;
  initial?: QuestionDraft;
}) {
  const { run, pending } = useAdminRun();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initial ?? EMPTY);
  const set = (change: Partial<QuestionDraft>) => setQ({ ...q, ...change });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={id ? "ghost" : "secondary"}>
          {id ? "Edit" : "Add question"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              async () => {
                const result = await saveQuestionAction({
                  id: id ?? null,
                  question: q,
                });
                if (result.ok) {
                  setOpen(false);
                  if (!id) setQ(EMPTY);
                }
                return result;
              },
              id ? "Question saved" : "Question added and verified",
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{id ? "Edit question" : "Add a question"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-topic">Topic</Label>
            <Input
              id="q-topic"
              value={q.topicName}
              maxLength={200}
              onChange={(e) => set({ topicName: e.target.value })}
              placeholder="Preamble"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-body">Question</Label>
            <Textarea
              id="q-body"
              value={q.body}
              maxLength={2000}
              onChange={(e) => set({ body: e.target.value })}
            />
          </div>
          <OptionFields
            options={q.options}
            correctIndex={q.correctIndex}
            onChange={set}
          />
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-small font-medium">Difficulty</span>
              <SegmentedControl
                ariaLabel="Difficulty"
                value={String(q.difficulty)}
                onValueChange={(v) => set({ difficulty: Number(v) })}
                options={[1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                size="sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-small font-medium">Language</span>
              <SegmentedControl
                ariaLabel="Language"
                value={q.language}
                onValueChange={(language) => set({ language })}
                options={[
                  { value: "EN", label: "English" },
                  { value: "ML", label: "Malayalam" },
                ]}
                size="sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-explanation">Explanation</Label>
            <Textarea
              id="q-explanation"
              value={q.explanation ?? ""}
              maxLength={2000}
              onChange={(e) => set({ explanation: e.target.value || null })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-source">Source</Label>
            <Input
              id="q-source"
              value={q.sourceRef ?? ""}
              maxLength={200}
              placeholder="Kerala PSC LDC 2019, or a book"
              onChange={(e) => set({ sourceRef: e.target.value || null })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
