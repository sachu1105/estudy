"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";

import { saveLibraryAction } from "../library-actions";

type Paper = { id: string; title: string; questions: number; keyed: number };
type Plan = "PRO" | "ELITE";

export type LibraryDraft = {
  id: string | null;
  title: string;
  description: string;
  paperIds: string[];
  rupees: number | null;
  includedIn: Plan[];
};

const field = "flex flex-col gap-1.5";

/**
 * A library entry: one paper or a bundle of them, free or priced, and the plans that
 * include it at no cost (they count only a real PRO or ELITE subscription).
 */
export function LibraryForm({
  papers,
  initial,
  onDone,
}: {
  papers: Paper[];
  initial: LibraryDraft;
  onDone: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [picked, setPicked] = useState(initial.paperIds);
  const [paid, setPaid] = useState<"free" | "paid">(
    initial.rupees === null ? "free" : "paid",
  );
  const [price, setPrice] = useState(String(initial.rupees ?? 199));
  const [plans, setPlans] = useState<Plan[]>(initial.includedIn);
  const toggle = <T,>(list: T[], item: T, on: boolean) =>
    on ? [...list, item] : list.filter((x) => x !== item);

  const save = () =>
    start(async () => {
      const result = await saveLibraryAction({
        id: initial.id,
        title,
        description,
        paperIds: papers.filter((p) => picked.includes(p.id)).map((p) => p.id),
        rupees: paid === "paid" ? Number(price) : null,
        includedIn: plans,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        initial.id ? "Saved." : "Saved as a draft. Publish it when it's ready.",
      );
      router.refresh();
      onDone();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={field}>
        <Label htmlFor={`${id}-t`}>Name</Label>
        <Input
          id={`${id}-t`}
          required
          minLength={3}
          maxLength={120}
          placeholder="Police constable 2022"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={field}>
        <Label htmlFor={`${id}-d`}>Description (optional)</Label>
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
        {papers.length === 0 ? (
          <p className="text-small text-ink-muted">
            No papers yet. Upload them in Tests with their answer keys first.
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
            {papers.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted">
                  <Checkbox
                    checked={picked.includes(p.id)}
                    onCheckedChange={(on) =>
                      setPicked((list) => toggle(list, p.id, on === true))
                    }
                    aria-label={p.title}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body">
                      {p.title.replaceAll("_", " ")}
                    </span>
                    <span className="text-small text-ink-muted">
                      {p.questions} questions · key {p.keyed} of {p.questions}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">Price</legend>
        <SegmentedControl
          ariaLabel="Price"
          value={paid}
          onValueChange={setPaid}
          className="w-full sm:w-64 [&>*]:flex-1"
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">
          Included free with
        </legend>
        <div className="flex flex-wrap gap-4">
          {(["PRO", "ELITE"] as const).map((plan) => (
            <label
              key={plan}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-body"
            >
              <Checkbox
                checked={plans.includes(plan)}
                onCheckedChange={(on) =>
                  setPlans((list) => toggle(list, plan, on === true))
                }
              />
              {plan === "PRO" ? "Pro" : "Elite"}
            </label>
          ))}
        </div>
        <p className="text-small text-ink-muted">
          Counts a real subscription, paid or granted, not the free launch.
        </p>
      </fieldset>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || picked.length === 0}
        >
          {pending ? "Saving" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
