"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { DISTRICTS, type District } from "@/lib/progress/districts";

import { savePrivacyAction } from "../actions";

/** Whether others see your name on the rank, and the district you rank in. */
export function PrivacyForm({
  initial,
}: {
  initial: { hideFromGlobalRank: boolean; district: string | null };
}) {
  const [hide, setHide] = useState(initial.hideFromGlobalRank);
  const [district, setDistrict] = useState(initial.district ?? "none");
  const [pending, start] = useTransition();
  return (
    <section
      aria-labelledby="privacy"
      className="flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="privacy" className="text-h3">
        Rank and privacy
      </h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="hide-rank">Hide me from the rank</Label>
          <p className="text-small text-ink-muted">
            Others see you as &quot;Anonymous aspirant&quot;. Your email is
            never shown either way.
          </p>
        </div>
        <Switch id="hide-rank" checked={hide} onCheckedChange={setHide} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="district">District (optional)</Label>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger id="district" className="max-w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-small text-ink-muted">
          For ranking among people near you.
        </p>
      </div>
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await savePrivacyAction({
              hideFromGlobalRank: hide,
              district: district === "none" ? null : (district as District),
            });
            if (!result.ok) return void toast.error(result.error);
            toast.success("Saved");
          })
        }
      >
        Save
      </Button>
    </section>
  );
}
