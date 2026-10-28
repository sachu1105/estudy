"use client";

import { ClipboardCheck } from "lucide-react";
import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";

import { shareTestInChatAction } from "../../chat-actions";
import { BuildTestForm } from "../build-test-form";

/**
 * A mock test into the chat: built from the question pool, or one the person took. It
 * goes out as a message everyone can take the test from.
 */
export function ChatTestDialog({
  groupId,
  channelId,
  topics,
  mine,
  open,
  onOpenChange,
  onShared,
}: {
  groupId: string;
  channelId: string;
  topics: string[];
  mine: { mockTestId: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared: () => void;
}) {
  const [from, setFrom] = useState<"pool" | "mine">("pool");
  const [pending, start] = useTransition();
  const share = (test: Parameters<typeof shareTestInChatAction>[0]) =>
    start(async () => {
      const result = await shareTestInChatAction(test);
      if (!result.ok) return void toast.error(result.error);
      onOpenChange(false);
      onShared();
    });
  const where = { groupId, channelId };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a mock test</DialogTitle>
          <DialogDescription>
            Everyone here takes the same questions and sees how they did.
          </DialogDescription>
        </DialogHeader>
        <SegmentedControl
          ariaLabel="Where the test comes from"
          value={from}
          onValueChange={setFrom}
          className="grid w-full grid-cols-2"
          options={[
            { value: "pool", label: "Build one" },
            { value: "mine", label: "One I took" },
          ]}
        />
        {from === "pool" ? (
          <BuildTestForm
            topics={topics}
            pending={pending}
            onSubmit={(test) =>
              share({ ...where, test: { from: "pool", ...test } })
            }
          />
        ) : mine.length === 0 ? (
          <p className="py-4 text-center text-body text-ink-muted">
            Take a test first; it shows up here to share.
          </p>
        ) : (
          <ul className="flex flex-col">
            {mine.map((t) => (
              <li key={t.mockTestId}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    share({
                      ...where,
                      test: { from: "mine", mockTestId: t.mockTestId },
                    })
                  }
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control px-2 text-left hover:bg-surface-muted disabled:opacity-50"
                >
                  <ClipboardCheck
                    className="size-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-body">
                    {t.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
