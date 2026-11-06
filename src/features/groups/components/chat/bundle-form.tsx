"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";

export type BundleDraft = {
  title: string;
  description: string;
  paperIds: string[];
  rupees: number | null;
};

type Paper = { id: string; title: string; questions: number; keyed: number };

/**
 * A bundle: its name, a line on what's in it, which papers, and (for a squad owner who
 * may sell) whether it's free or paid. Papers without a full key say so: buyers see the
 * key after each sitting.
 */
export function BundleForm({
  papers,
  canCharge,
  pending,
  onShare,
}: {
  papers: Paper[];
  canCharge: boolean;
  pending: boolean;
  onShare: (draft: BundleDraft) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [paid, setPaid] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("199");
  const toggle = (paperId: string, on: boolean) =>
    setPicked((p) => (on ? [...p, paperId] : p.filter((x) => x !== paperId)));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onShare({
          title,
          description,
          // In the order they appear, which is the order they're listed in the bundle.
          paperIds: papers
            .filter((p) => picked.includes(p.id))
            .map((p) => p.id),
          rupees: canCharge && paid === "paid" ? Number(price) : null,
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-t`}>Name</Label>
        <Input
          id={`${id}-t`}
          required
          minLength={3}
          maxLength={120}
          placeholder="Police constable PYQs 2019–2022"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-d`}>What&apos;s in it (optional)</Label>
        <Textarea
          id={`${id}-d`}
          rows={2}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">
          Papers · {picked.length} picked
        </legend>
        <ul className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
          {papers.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted">
                <Checkbox
                  checked={picked.includes(p.id)}
                  onCheckedChange={(on) => toggle(p.id, on === true)}
                  aria-label={p.title}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">
                    {p.title.replaceAll("_", " ")}
                  </span>
                  <span className="text-small text-ink-muted">
                    {p.questions} questions
                    {p.keyed < p.questions
                      ? ` · key ${p.keyed} of ${p.questions}`
                      : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {canCharge ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium">Price</legend>
          <SegmentedControl
            ariaLabel="Price"
            value={paid}
            onValueChange={setPaid}
            className="w-full [&>*]:flex-1"
            options={[
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ]}
          />
          {paid === "paid" ? (
            <div className="flex items-center gap-2">
              <span className="text-body">₹</span>
              <Input
                aria-label="Price in rupees"
                type="number"
                inputMode="numeric"
                min={MIN_RUPEES}
                max={MAX_RUPEES}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32"
              />
              <span className="text-small text-ink-muted">
                once, theirs for good
              </span>
            </div>
          ) : null}
        </fieldset>
      ) : (
        <p className="text-small text-ink-muted">
          Free to everyone here. Only the squad&apos;s owner can charge for a bundle.
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={pending || picked.length === 0}
      >
        {pending ? "Sharing" : "Share bundle"}
      </Button>
    </form>
  );
}
