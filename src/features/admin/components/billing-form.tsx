"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SwitchRow } from "./plans/switch-row";
import { useSaveSetting } from "./use-save-setting";

/**
 * While billing is off, everyone gets ELITE except paid-only features (rule 8). Flipping
 * it changes what every user can do at once, so it asks first, then saves.
 */
export function BillingForm({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [asking, setAsking] = useState<boolean | null>(null);
  const { save, pending } = useSaveSetting("billing");

  const confirm = () => {
    if (asking === null) return;
    const next = asking;
    setAsking(null);
    setEnabled(next);
    save({ enabled: next }, next ? "Billing is on" : "Billing is off", {
      failed: () => setEnabled(!next),
    });
  };

  return (
    <>
      <SwitchRow
        id="billing"
        title="Billing"
        on={enabled}
        pending={pending}
        onFlip={setAsking}
      >
        {enabled
          ? "Each person gets the plan they pay for or were granted. The Free and Pro limits below apply."
          : "Launch mode: everyone gets Elite for free. Only rows marked Paid only follow each person's real plan."}
      </SwitchRow>
      <Dialog
        open={asking !== null}
        onOpenChange={(o) => !o && setAsking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {asking ? "Turn billing on?" : "Turn billing off?"}
            </DialogTitle>
            <DialogDescription>
              {asking
                ? "Everyone without a paid or granted plan moves to the Free limits within 30 seconds."
                : "Everyone gets Elite for free again within 30 seconds. Paid-only features still need a real plan."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAsking(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirm}>
              {asking ? "Turn billing on" : "Turn billing off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
