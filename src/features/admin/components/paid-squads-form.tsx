"use client";

import { useState } from "react";

import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useSaveSetting } from "./use-save-setting";

/**
 * Paid squads and channels, on or off for the whole site. Saves at once, like the AI
 * switch. Who may sell is the plans table's "Paid squads and channels" row.
 */
export function PaidSquadsForm({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { save, pending } = useSaveSetting("paidSquads");
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="paid-squads" className="text-h3">
            Paid squads
          </Label>
          <p className="text-small text-ink-muted">
            {enabled
              ? "On. Elite owners (paid or granted) can charge to join their squad or open a channel. Payments are a demo: no money moves until Razorpay is added."
              : "Off. Nobody sees a price field, and paid squads stop selling passes. Everyone who paid keeps their access."}
          </p>
        </div>
        <Switch
          id="paid-squads"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(on) => {
            setEnabled(on);
            save(
              { enabled: on },
              on ? "Paid squads are on" : "Paid squads are off",
            );
          }}
        />
      </div>
    </section>
  );
}
