"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

import { setSquadOfferAction } from "../../actions";
import { priceDraft } from "./price-fields";
import {
  emptyOffer,
  fromOfferDraft,
  SquadOfferFields,
  type OfferDraft,
} from "./squad-offer-fields";

/**
 * The owner's pass: on, people pay to join; off, the squad is free again (everyone who
 * paid stays in). Without the right to sell, the price can only be taken off.
 */
export function SquadOfferForm({
  groupId,
  initial,
  canPrice,
}: {
  groupId: string;
  initial: {
    pricePaise: number | null;
    accessDays: number | null;
    offer: string | null;
    demoUrl: string | null;
  };
  canPrice: boolean;
}) {
  const router = useRouter();
  const [paid, setPaid] = useState(initial.pricePaise !== null);
  const [draft, setDraft] = useState<OfferDraft>(
    initial.pricePaise !== null
      ? {
          ...priceDraft(initial.pricePaise, initial.accessDays),
          offer: initial.offer ?? "",
          demoUrl: initial.demoUrl ?? "",
        }
      : emptyOffer,
  );
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await setSquadOfferAction({
        groupId,
        offer: paid ? fromOfferDraft(draft) : null,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(paid ? "Pass saved" : "The squad is free now");
      router.refresh();
    });

  return (
    <section
      aria-labelledby="squad-pass"
      className="flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label id="squad-pass" htmlFor="squad-paid" className="text-h3">
            Paid squad
          </Label>
          <p className="text-small text-ink-muted">
            {paid
              ? "People pay for a pass to join. Members you invite get in free."
              : "Free to join. Turn this on to charge for a pass."}
          </p>
        </div>
        <Switch
          id="squad-paid"
          checked={paid}
          disabled={!canPrice && !paid}
          onCheckedChange={setPaid}
        />
      </div>
      {paid ? (
        <SquadOfferFields
          id="squad-offer"
          value={draft}
          onChange={setDraft}
          disabled={!canPrice}
        />
      ) : null}
      {!canPrice ? (
        <p className="text-small text-ink-muted">
          Paid squads are switched off, or not on your plan: you can make the
          squad free, but not change its price.
        </p>
      ) : null}
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending || (paid && !draft.rupees)}
        onClick={save}
      >
        Save pass
      </Button>
    </section>
  );
}
