"use client";

import { MessageSquareReply } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { FeedbackResult } from "@/features/feedback/actions";
import { TEAM_NOTE_MAX } from "@/lib/feedback/schemas";

type DecideFormProps<S extends string> = {
  id: string;
  status: S;
  teamNote: string | null;
  statuses: readonly S[];
  labels: Record<S, string>;
  action: (input: unknown) => Promise<FeedbackResult>;
};

/**
 * Staff move an idea or a report along and, if they like, answer it. The person who sent
 * it is told either way; the reply shows under it as "studypods team".
 */
export function DecideForm<S extends string>({
  id,
  status,
  teamNote,
  statuses,
  labels,
  action,
}: DecideFormProps<S>) {
  const router = useRouter();
  const [next, setNext] = useState<S>(status);
  const [note, setNote] = useState(teamNote ?? "");
  const [replying, setReplying] = useState(Boolean(teamNote));
  const [pending, start] = useTransition();
  const changed = next !== status || note.trim() !== (teamNote ?? "");

  const save = () =>
    start(async () => {
      const result = await action({ id, status: next, teamNote: note });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Saved. They've been told.");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      {replying ? (
        <Textarea
          rows={2}
          value={note}
          maxLength={TEAM_NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Your reply, shown to them as the studypods team"
          aria-label="Reply"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={next} onValueChange={(v) => setNext(v as S)}>
          <SelectTrigger aria-label="Status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {labels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!replying ? (
          <Button variant="ghost" size="sm" onClick={() => setReplying(true)}>
            <MessageSquareReply aria-hidden /> Reply
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={save}
          disabled={!changed || pending}
          className="ml-auto"
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
