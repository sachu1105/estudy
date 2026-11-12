"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { sellerShare } from "@/lib/omr/store";
import { rupees as money } from "@/lib/pricing/pricing";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";

import { sellAction } from "../../store-actions";
import { SellPapers, type SellPaper } from "./sell-papers";

const field = "flex flex-col gap-1.5";

/**
 * Sell your own papers in the Store: one paper or a bundle, free, or priced when the
 * seller's plan sells. It goes to an admin before anyone sees it.
 */
export function SellForm({
  papers,
  canPrice,
  cutPercent,
}: {
  papers: SellPaper[];
  canPrice: boolean;
  cutPercent: number;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [paid, setPaid] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("99");
  const [rights, setRights] = useState(false);
  const pricePaise = Math.round(Number(price) * 100);

  const send = () =>
    start(async () => {
      const result = await sellAction({
        title,
        description,
        paperIds: papers.filter((p) => picked.includes(p.id)).map((p) => p.id),
        rupees: paid === "paid" ? Number(price) : null,
        rights,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Sent for review. We'll tell you when it's live.");
      router.push(`/bundles/${result.id}`);
    });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className={field}>
        <Label htmlFor={`${id}-t`}>Name</Label>
        <Input
          id={`${id}-t`}
          required
          minLength={3}
          maxLength={120}
          placeholder="LDC 2024 previous papers"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={field}>
        <Label htmlFor={`${id}-d`}>About it (optional)</Label>
        <Textarea
          id={`${id}-d`}
          rows={3}
          maxLength={1000}
          placeholder="Which exam and year, and where the key comes from."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <SellPapers papers={papers} picked={picked} onChange={setPicked} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium">Price</legend>
        {canPrice ? (
          <>
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
              <div className="flex flex-col gap-1.5">
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
                </div>
                {pricePaise > 0 ? (
                  <p className="text-small text-ink-muted">
                    You get {money(sellerShare(pricePaise, cutPercent))} of each
                    sale; studypods keeps {cutPercent}%.
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-small text-ink-muted">
            Free. A price needs a plan that sells, with paid squads switched on.
          </p>
        )}
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body">
        <Checkbox
          className="mt-0.5"
          checked={rights}
          onCheckedChange={(on) => setRights(on === true)}
        />
        <span>
          These papers and their keys are mine to share. Buyers see the key as
          mine unless I marked it official.
        </span>
      </label>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full sm:w-auto sm:self-start"
        disabled={pending || picked.length === 0 || !rights}
      >
        {pending ? "Sending" : "Send for review"}
      </Button>
    </form>
  );
}
