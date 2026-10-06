"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { grantPlanAction } from "../actions";
import { useAdminRun } from "./use-admin-run";

type Plan = "FREE" | "PRO" | "ELITE";

/** Gives a user a plan, for a while or with no end (an admin grant, rule 8). */
export function GrantPlan({ userId, plan }: { userId: string; plan: Plan }) {
  const { run, pending } = useAdminRun();
  const [nextPlan, setNextPlan] = useState(plan);
  const [months, setMonths] = useState("0");
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-h3">Plan</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="grant-plan">Plan</Label>
          <Select
            value={nextPlan}
            onValueChange={(v) => setNextPlan(v as Plan)}
          >
            <SelectTrigger id="grant-plan" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["FREE", "PRO", "ELITE"] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  {p.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="grant-months">For</Label>
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger id="grant-months" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No end date</SelectItem>
              {[1, 3, 6, 12].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} month{m === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                grantPlanAction({
                  userId,
                  plan: nextPlan,
                  months: months === "0" ? null : Number(months),
                }),
              "Plan granted",
            )
          }
        >
          Grant plan
        </Button>
      </div>
    </section>
  );
}
