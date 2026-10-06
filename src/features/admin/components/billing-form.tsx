"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useSaveSetting } from "./use-save-setting";

/**
 * While billing is off, everyone gets ELITE except paid-only features (rule 8). Turning it
 * on makes subscriptions count; payments arrive with milestone 16.
 */
export function BillingForm({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { save, pending } = useSaveSetting("billing");
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="billing" className="text-h3">
            Billing
          </Label>
          <p className="text-small text-ink-muted">
            Off: everyone gets ELITE (paid-only features still need a real plan
            or a grant). On: each user gets the plan they hold.
          </p>
        </div>
        <Switch id="billing" checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending || enabled === initial}
        onClick={() =>
          save({ enabled }, enabled ? "Billing is on" : "Billing is off")
        }
      >
        Save
      </Button>
    </section>
  );
}
