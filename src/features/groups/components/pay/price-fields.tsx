"use client";

import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCESS_PERIODS,
  MAX_RUPEES,
  periodLabel,
  type AccessDays,
} from "@/lib/squads/pay";

/** A price as typed: whole rupees as text, so the field can be empty while editing. */
export type PriceDraft = { rupees: string; accessDays: AccessDays };

export const priceDraft = (
  pricePaise: number | null | undefined,
  accessDays: number | null | undefined,
): PriceDraft => ({
  rupees: pricePaise ? String(pricePaise / 100) : "",
  accessDays: (accessDays ?? null) as AccessDays,
});

/** What the actions take. Validation (range, whole rupees) is the schema's. */
export const fromDraft = (draft: PriceDraft) => ({
  rupees: Number(draft.rupees),
  accessDays: draft.accessDays,
});

/** What one pass costs and how long it lasts, side by side from sm. */
export function PriceFields({
  id,
  value,
  onChange,
}: {
  id: string;
  value: PriceDraft;
  onChange: (next: PriceDraft) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-price`}>Price</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          >
            ₹
          </span>
          <Input
            id={`${id}-price`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="499"
            className="pl-7 font-mono tabular-nums"
            value={value.rupees}
            maxLength={String(MAX_RUPEES).length}
            onChange={(e) =>
              onChange({ ...value, rupees: e.target.value.replace(/\D/g, "") })
            }
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={`${id}-period`}>One payment lasts</Label>
        <Select
          value={String(value.accessDays)}
          onValueChange={(v) =>
            onChange({
              ...value,
              accessDays: (v === "null" ? null : Number(v)) as AccessDays,
            })
          }
        >
          <SelectTrigger id={`${id}-period`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_PERIODS.map((d) => (
              <SelectItem key={String(d)} value={String(d)}>
                {periodLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
