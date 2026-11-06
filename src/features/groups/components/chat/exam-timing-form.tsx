"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { ReleaseChoice } from "@/lib/omr/exam";

export type ExamTiming = {
  opensAt: string | null;
  closesAt: string | null;
  results: ReleaseChoice;
  resultsAt: string | null;
  showNames: boolean;
};

/** A datetime-local value an hour or so from now, on the hour. */
function later(hours: number) {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}
/** The browser's local time, as the server wants it. */
const iso = (local: string) => (local ? new Date(local).toISOString() : null);

/**
 * When the exam runs: opens now or at a time, closes never or at a time, and results out
 * right away, when it closes, or at a time. Names on the rank list are off by default.
 */
export function ExamTimingForm({
  paper,
  pending,
  onBack,
  onShare,
}: {
  paper: { id: string; title: string; questions: number; keyed: number };
  pending: boolean;
  onBack: () => void;
  onShare: (timing: ExamTiming) => void;
}) {
  const id = useId();
  const [opens, setOpens] = useState<"now" | "at">("now");
  const [opensAt, setOpensAt] = useState(later(1));
  const [closes, setCloses] = useState<"never" | "at">("at");
  const [closesAt, setClosesAt] = useState(later(3));
  const [results, setResults] = useState<ReleaseChoice>("close");
  const [resultsAt, setResultsAt] = useState(later(4));
  const [showNames, setShowNames] = useState(false);
  const releaseOptions = [
    { value: "now" as const, label: "Right away" },
    ...(closes === "at"
      ? [{ value: "close" as const, label: "When it closes" }]
      : []),
    { value: "at" as const, label: "At a time" },
  ];
  const release = closes === "never" && results === "close" ? "now" : results;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onShare({
          opensAt: opens === "at" ? iso(opensAt) : null,
          closesAt: closes === "at" ? iso(closesAt) : null,
          results: release,
          resultsAt: release === "at" ? iso(resultsAt) : null,
          showNames,
        });
      }}
    >
      <p className="text-small text-ink-muted">
        <span className="font-medium text-ink">
          {paper.title.replaceAll("_", " ")}
        </span>{" "}
        · {paper.questions} questions
      </p>
      {paper.keyed < paper.questions ? (
        <p className="flex items-start gap-2 rounded-control bg-surface-muted px-3 py-2 text-small">
          <KeyRound
            className="mt-0.5 size-4 shrink-0 text-ink-muted"
            aria-hidden
          />
          <span>
            The key has {paper.keyed} of {paper.questions}. Finish it before
            results come out.{" "}
            <Link
              href={`/omr/${paper.id}/key`}
              className="font-medium text-accent-ink hover:underline"
            >
              Answer key
            </Link>
          </span>
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">Opens</legend>
        <SegmentedControl
          ariaLabel="Opens"
          value={opens}
          onValueChange={setOpens}
          className="w-full [&>*]:flex-1"
          options={[
            { value: "now", label: "Now" },
            { value: "at", label: "At a time" },
          ]}
        />
        {opens === "at" ? (
          <Input
            aria-label="Opens at"
            type="datetime-local"
            required
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
          />
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">Closes</legend>
        <SegmentedControl
          ariaLabel="Closes"
          value={closes}
          onValueChange={setCloses}
          className="w-full [&>*]:flex-1"
          options={[
            { value: "at", label: "At a time" },
            { value: "never", label: "Never" },
          ]}
        />
        {closes === "at" ? (
          <Input
            aria-label="Closes at"
            type="datetime-local"
            required
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        ) : null}
        <p className="text-small text-ink-muted">
          Sittings after it closes are practice, off the rank list.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">
          Results and the key
        </legend>
        <SegmentedControl
          ariaLabel="Results"
          value={release}
          onValueChange={setResults}
          className="w-full [&>*]:flex-1"
          options={releaseOptions}
        />
        {release === "at" ? (
          <Input
            aria-label="Results at"
            type="datetime-local"
            required
            value={resultsAt}
            onChange={(e) => setResultsAt(e.target.value)}
          />
        ) : null}
      </fieldset>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <Label htmlFor={`${id}-names`} className="text-body">
            Names on the rank list
          </Label>
          <span className="text-small text-ink-muted">
            {showNames
              ? "Everyone sees who scored what."
              : "Off: register numbers only. You always see names."}
          </span>
        </div>
        <Switch
          id={`${id}-names`}
          checked={showNames}
          onCheckedChange={setShowNames}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={pending}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={pending}
        >
          {pending ? "Sharing" : "Share exam"}
        </Button>
      </div>
    </form>
  );
}
