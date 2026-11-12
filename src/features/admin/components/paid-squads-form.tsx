"use client";

import { useState } from "react";

import { SwitchRow } from "./plans/switch-row";
import { useSaveSetting } from "./use-save-setting";

/**
 * Paid squads and channels, on or off for the whole site. Saves at once, like the AI
 * switch. Who may sell is the plans table's "Charge for their squad or channels" row.
 */
export function PaidSquadsForm({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { save, pending } = useSaveSetting("paidSquads");
  return (
    <SwitchRow
      id="paid-squads"
      title="Paid squads"
      on={enabled}
      pending={pending}
      onFlip={(on) => {
        setEnabled(on);
        save(
          { enabled: on },
          on ? "Paid squads are on" : "Paid squads are off",
          {
            failed: () => setEnabled(!on),
          },
        );
      }}
    >
      {enabled
        ? "Owners whose plan allows it can charge to join their squad or open a channel. Payments are a demo: no money moves until Razorpay is added."
        : "Nobody sees a price field, and paid squads stop selling passes. Everyone who paid keeps their access."}
    </SwitchRow>
  );
}
