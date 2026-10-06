"use client";

import { useOptimistic, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";

import { setTopicDoneAction } from "../actions";

/** "Done" for one topic, ticked at once and rolled back if saving fails. */
export function TopicDoneToggle({
  podId,
  topicId,
  done,
}: {
  podId: string;
  topicId: string;
  done: boolean;
}) {
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(done);
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border bg-surface px-4">
      <Checkbox
        tone="success"
        checked={shown}
        onCheckedChange={(v) =>
          start(async () => {
            setShown(v === true);
            const result = await setTopicDoneAction({
              podId,
              topicId,
              done: v === true,
            });
            if (!result.ok) toast.error(result.error);
          })
        }
      />
      <span className="text-body font-medium">
        {shown ? "Done" : "Mark as done"}
      </span>
    </label>
  );
}
