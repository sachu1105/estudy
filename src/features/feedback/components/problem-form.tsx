"use client";

import {
  BookX,
  Bug,
  CircleHelp,
  CircleUser,
  Lock,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { reportProblemAction } from "@/features/feedback/actions";
import {
  ChoiceTiles,
  type TileChoice,
} from "@/features/groups/components/choice-tiles";
import { PROBLEM_BODY_MAX, type ProblemCategory } from "@/lib/feedback/schemas";

import { useDraft } from "../use-draft";
import { CreditCheck } from "./credit-check";

const KINDS: TileChoice<ProblemCategory>[] = [
  {
    value: "BUG",
    label: "Bug",
    icon: Bug,
    tint: "fuchsia",
    description: "Something broke, froze or showed an error.",
  },
  {
    value: "CONFUSING",
    label: "Unclear",
    icon: CircleHelp,
    tint: "sky",
    description:
      "You couldn't find something, or it didn't do what you expected.",
  },
  {
    value: "CONTENT",
    label: "Content",
    icon: BookX,
    tint: "violet",
    description: "A wrong answer, a typo, or a syllabus topic that's off.",
  },
  {
    value: "ACCOUNT",
    label: "Account",
    icon: CircleUser,
    tint: "teal",
    description: "Signing in, your plan, payments or your data.",
  },
  {
    value: "OTHER",
    label: "Other",
    icon: MessageCircle,
    description: "Anything else you'd like the team to know.",
  },
];

/** A complaint or a bug, straight to the team. Only they and the sender see it. */
export function ProblemForm({ from }: { from: string }) {
  const router = useRouter();
  const [draft, update, clear] = useDraft("feedback-problem", {
    category: "BUG" as ProblemCategory,
    body: "",
    page: "",
    credit: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const page = draft.page || from;

  const send = () =>
    start(async () => {
      setError(null);
      const result = await reportProblemAction({ ...draft, page });
      if (!result.ok) return setError(result.error);
      clear();
      toast.success("Report sent", {
        description: "We'll reply right here, under Your reports.",
      });
      router.refresh();
    });

  return (
    <Card className="p-4 sm:p-5">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">Tell us what went wrong</h2>
          <p className="flex items-center gap-1.5 text-small text-ink-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden /> Only you and the
            studypods team see this.
          </p>
        </div>
        <ChoiceTiles
          label="What kind of problem?"
          options={KINDS}
          value={draft.category}
          onChange={(category) => update({ category })}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="problem-body">What happened?</Label>
          <Textarea
            id="problem-body"
            rows={4}
            value={draft.body}
            maxLength={PROBLEM_BODY_MAX}
            placeholder="What you did, what you expected, and what happened instead."
            onChange={(e) => update({ body: e.target.value })}
            aria-invalid={Boolean(error) || undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="problem-page">Where? (optional)</Label>
          <Input
            id="problem-page"
            value={page}
            maxLength={200}
            placeholder="e.g. Tests, the answer sheet"
            onChange={(e) => update({ page: e.target.value })}
          />
        </div>
        <CreditCheck
          checked={draft.credit}
          onChange={(credit) => update({ credit })}
        >
          Put my name on the contributors wall if it gets fixed
        </CreditCheck>
        {error ? (
          <p role="alert" className="text-small text-danger-ink">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="sm:self-end"
        >
          {pending ? "Sending…" : "Send report"}
        </Button>
      </form>
    </Card>
  );
}
