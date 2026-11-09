"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { postTeamIdeaAction } from "@/features/feedback/actions";
import {
  IDEA_BODY_MAX,
  TITLE_MAX,
  type IdeaArea,
} from "@/lib/feedback/schemas";

import { AreaChips } from "../area-chips";

/** The team asks "Would you use this?": the idea opens for votes straight away. */
export function TeamIdea() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState<IdeaArea>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      const result = await postTeamIdeaAction({ title, body, area });
      if (!result.ok) return setError(result.error);
      setTitle("");
      setBody("");
      setOpen(false);
      toast.success("Posted. People can vote on it now.");
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Sparkles aria-hidden /> Ask &ldquo;Would you use this?&rdquo;
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask before you build</DialogTitle>
          <DialogDescription>
            Describe something the team is thinking of. It opens for votes at
            once, marked as from the team.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-title">The idea</Label>
            <Input
              id="team-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily 10-question quiz on your weakest topic"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-body">What it would do</Label>
            <Textarea
              id="team-body"
              rows={3}
              value={body}
              maxLength={IDEA_BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <AreaChips value={area} onChange={setArea} />
          {error ? (
            <p role="alert" className="text-small text-danger-ink">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Posting…" : "Post for votes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
