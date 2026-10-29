"use client";

import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { fromDraft, PriceFields, type PriceDraft } from "./price-fields";

/** A paid squad's pass as typed: the price, and what people read before paying. */
export type OfferDraft = PriceDraft & { offer: string; demoUrl: string };

export const emptyOffer: OfferDraft = {
  rupees: "",
  accessDays: 30,
  offer: "",
  demoUrl: "",
};

/** What setSquadOfferAction and createGroupAction take. */
export const fromOfferDraft = (draft: OfferDraft) => ({
  ...fromDraft(draft),
  offer: draft.offer,
  demoUrl: draft.demoUrl,
});

/** Price, how long it lasts, what members get, and a demo to watch first. */
export function SquadOfferFields({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: OfferDraft;
  onChange: (next: OfferDraft) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4">
      <PriceFields
        id={id}
        value={value}
        onChange={(price) => onChange({ ...value, ...price })}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-offer`}>What members get</Label>
        <Textarea
          id={`${id}-offer`}
          rows={3}
          value={value.offer}
          maxLength={1000}
          placeholder="Daily mock tests with answers explained, weekly live doubt sessions, notes for every subject."
          onChange={(e) => onChange({ ...value, offer: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-demo`}>Demo class link (optional)</Label>
        <Input
          id={`${id}-demo`}
          type="url"
          inputMode="url"
          value={value.demoUrl}
          maxLength={500}
          placeholder="https://youtube.com/watch?v=..."
          onChange={(e) => onChange({ ...value, demoUrl: e.target.value })}
        />
        <span className="text-small text-ink-muted">
          People watch it before they pay.
        </span>
      </div>
    </fieldset>
  );
}
