"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";

const MAX = 10;

/** A poll for the chat: a question and two to ten choices. */
export function PollDialog({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (question: string, options: string[]) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ready =
    question.trim().length > 0 &&
    filled.length >= 2 &&
    new Set(filled.map((o) => o.toLowerCase())).size === filled.length;
  const set = (i: number, value: string) =>
    setOptions((all) => all.map((o, j) => (j === i ? value : o)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            onSend(question.trim(), filled);
            setQuestion("");
            setOptions(["", ""]);
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Make a poll</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              value={question}
              maxLength={300}
              placeholder="When shall we do the next mock?"
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-medium">Choices</legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={o}
                  maxLength={100}
                  aria-label={`Choice ${i + 1}`}
                  placeholder={`Choice ${i + 1}`}
                  onChange={(e) => set(i, e.target.value)}
                />
                {options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove choice ${i + 1}`}
                    onClick={() =>
                      setOptions((all) => all.filter((_, j) => j !== i))
                    }
                  >
                    <X aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
            {options.length < MAX ? (
              <Button
                type="button"
                variant="ghost"
                className="self-start"
                onClick={() => setOptions((all) => [...all, ""])}
              >
                <Plus aria-hidden /> Add a choice
              </Button>
            ) : null}
          </fieldset>
          <DialogFooter>
            <Button type="submit" variant="primary" disabled={!ready}>
              Send poll
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
