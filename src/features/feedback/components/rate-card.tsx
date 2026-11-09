"use client";

import { BadgeCheck, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { rateAppAction } from "@/features/feedback/actions";
import { NOTE_MAX, STAR_WORDS } from "@/lib/feedback/schemas";

/** What we ask next depends on the stars: a 5 tells us what to keep. */
const ASK = [
  "What went wrong? Tell us and we'll fix it.",
  "What's missing for you?",
  "What would make it a 5?",
  "What would make it a 5?",
  "What do you love most? We'll keep it.",
];

type Saved = { stars: number; note: string } | null;

/** "How is studypods for you?": stars, an optional line, and a quiet summary once saved. */
export function RateCard({
  saved,
  contributor,
}: {
  saved: Saved;
  contributor: boolean;
}) {
  const [current, setCurrent] = useState<Saved>(saved);
  const [editing, setEditing] = useState(!saved);
  const [stars, setStars] = useState(saved?.stars ?? 0);
  const [note, setNote] = useState(saved?.note ?? "");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await rateAppAction({ stars, note });
      if (!result.ok) return void toast.error(result.error);
      setCurrent({ stars, note });
      setEditing(false);
      toast.success(
        stars >= 4 ? "Thank you, that means a lot" : "Thanks for being honest",
        {
          description:
            stars >= 4
              ? undefined
              : "We read every rating. Tell us more under Report a problem.",
        },
      );
    });

  const badge = contributor ? (
    <Badge tone="accent">
      <BadgeCheck aria-hidden /> Contributor
    </Badge>
  ) : null;

  if (!editing && current)
    return (
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-small text-ink-muted">Your rating</span>
          <span className="flex items-center gap-2">
            <Rating
              value={current.stars}
              onChange={(v) => {
                setStars(v);
                setEditing(true);
              }}
              label="Your rating"
              words={STAR_WORDS}
            />
            <span className="text-small font-medium text-ink">
              {STAR_WORDS[current.stars - 1]}
            </span>
          </span>
        </div>
        {badge}
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden /> Change
        </Button>
      </Card>
    );

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-h3">How is studypods for you?</h2>
          <p className="text-small text-ink-muted">
            {stars ? STAR_WORDS[stars - 1] : "Tap a star. It takes a second."}
          </p>
        </div>
        <Rating
          value={stars}
          onChange={setStars}
          label="Rate studypods"
          words={STAR_WORDS}
          size="lg"
          className="-mx-1.5"
        />
      </div>
      {stars ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Textarea
            rows={2}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder={ASK[stars - 1]}
            aria-label={ASK[stars - 1]}
            className="sm:flex-1"
          />
          <div className="flex gap-2">
            {current ? (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
            <Button
              onClick={save}
              disabled={pending}
              className="flex-1 sm:flex-none"
            >
              {pending ? "Saving…" : "Save rating"}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
