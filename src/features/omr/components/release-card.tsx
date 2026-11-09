"use client";

import { Check, EyeOff } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

import { savePaperReleaseAction } from "../actions";

type When = "hand-in" | "at";

/** Tomorrow at 6 pm, in the browser's time, as a datetime-local value. */
function tomorrowEvening() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/**
 * What people who sit this paper but don't own it (a bundle, the Store, a squad exam)
 * see once they hand in: their score straight away or from a set time, and the key with
 * it or never (the score alone). The owner's own sittings always show everything.
 */
export function ReleaseCard({
  paperId,
  initialAt,
  initialKeyHidden,
}: {
  paperId: string;
  /** The saved results time as a datetime-local value in the person's time zone. */
  initialAt: string | null;
  initialKeyHidden: boolean;
}) {
  const id = useId();
  const [saved, setSaved] = useState({
    at: initialAt,
    keyHidden: initialKeyHidden,
  });
  const [when, setWhen] = useState<When>(initialAt ? "at" : "hand-in");
  const [at, setAt] = useState(initialAt ?? "");
  const [keyHidden, setKeyHidden] = useState(initialKeyHidden);
  const [pending, start] = useTransition();
  const next = { at: when === "at" ? at : null, keyHidden };
  const dirty = next.at !== saved.at || next.keyHidden !== saved.keyHidden;

  const save = () =>
    start(async () => {
      const result = await savePaperReleaseAction({
        id: paperId,
        resultsAt: next.at ? new Date(next.at).toISOString() : null,
        keyHidden: next.keyHidden,
      });
      if (!result.ok) return void toast.error(result.error);
      setSaved(next);
      toast("Saved. Results follow the new setting.");
    });

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-col">
        <h2 className="font-heading text-h2 font-semibold">What others see</h2>
        <p className="text-small text-ink-muted">
          For anyone who sits this paper from your bundles, the Store or a squad
          exam. Your own sittings always show everything.
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium">
            Score comes out
          </legend>
          <SegmentedControl
            ariaLabel="Score comes out"
            value={when}
            onValueChange={(value) => {
              setWhen(value);
              if (value === "at" && !at) setAt(tomorrowEvening());
            }}
            className="w-full sm:max-w-md [&>*]:flex-1"
            options={[
              { value: "hand-in", label: "On submit" },
              { value: "at", label: "At a time" },
            ]}
          />
          {when === "at" ? (
            <Input
              aria-label="Results at"
              type="datetime-local"
              required
              className="sm:max-w-xs"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          ) : null}
          <span className="text-small text-ink-muted">
            {when === "at"
              ? "Until then they see only what they marked. A squad exam of this paper waits for this time too."
              : "Each person sees their score as soon as they submit."}
          </span>
        </fieldset>

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <Label htmlFor={`${id}-key`} className="text-body">
              Show the answer key
            </Label>
            <span className="text-small text-ink-muted">
              {keyHidden ? (
                <span className="inline-flex items-start gap-1">
                  <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Off: score only. They never see the right answers, so you can
                  use the paper again.
                </span>
              ) : (
                "With their score, question by question."
              )}
            </span>
          </div>
          <Switch
            id={`${id}-key`}
            checked={!keyHidden}
            onCheckedChange={(on) => setKeyHidden(!on)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            disabled={!dirty || pending || (when === "at" && !at)}
          >
            {pending ? "Saving" : "Save"}
          </Button>
          {dirty ? null : (
            <span className="inline-flex items-center gap-1 text-small text-ink-muted">
              <Check className="size-3.5" aria-hidden /> Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
