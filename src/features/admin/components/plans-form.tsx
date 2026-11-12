"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  FLAG_FEATURES,
  LIMIT_FEATURES,
  PLAN_NAMES,
  type SettingValue,
} from "@/lib/settings/schemas";

import {
  MB,
  countChanges,
  isBytes,
  type Flag,
  type Limit,
  type Plan,
  type PlanTable,
} from "./plans/plan-rows";
import { PlanCard } from "./plans/plan-card";
import { useSaveSetting } from "./use-save-setting";

export type { PlanTable } from "./plans/plan-rows";

/**
 * What each plan includes, a card per plan. Changed boxes are marked until saved; the
 * bar at the foot counts them and holds the page's one Save. Only what differs from the
 * built-in defaults is stored.
 */
export function PlansForm({
  initial,
  defaults,
  paidOnly,
  billingOn,
}: {
  initial: PlanTable;
  defaults: PlanTable;
  paidOnly: readonly string[];
  billingOn: boolean;
}) {
  const [table, setTable] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const { save, pending } = useSaveSetting("entitlements");
  const changed = countChanges(table, saved);
  const atDefaults = countChanges(table, defaults) === 0;

  const setLimit = (plan: Plan, f: Limit, raw: string) => {
    const typed = raw.replace(/[^\d]/g, "");
    const n = typed === "" ? null : Number(typed) * (isBytes(f) ? MB : 1);
    setTable((t) => ({
      ...t,
      [plan]: { ...t[plan], limits: { ...t[plan].limits, [f]: n } },
    }));
  };
  const setFlag = (plan: Plan, f: Flag, on: boolean) =>
    setTable((t) => ({
      ...t,
      [plan]: { ...t[plan], flags: { ...t[plan].flags, [f]: on } },
    }));

  const overrides = (): SettingValue<"entitlements"> =>
    Object.fromEntries(
      PLAN_NAMES.map((plan) => [
        plan,
        {
          limits: Object.fromEntries(
            LIMIT_FEATURES.filter(
              (f) => table[plan].limits[f] !== defaults[plan].limits[f],
            ).map((f) => [f, table[plan].limits[f]]),
          ),
          flags: Object.fromEntries(
            FLAG_FEATURES.filter(
              (f) => table[plan].flags[f] !== defaults[plan].flags[f],
            ).map((f) => [f, table[plan].flags[f]]),
          ),
        },
      ]),
    );

  return (
    <div className="flex flex-col gap-4">
      {billingOn ? null : (
        <p className="flex gap-2.5 rounded-control border border-border bg-surface-muted p-3 text-small text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Billing is off, so everyone gets Elite for free right now. Rows
            marked <strong className="font-medium">Paid only</strong> still
            follow each person&apos;s real plan. Free and Pro limits start to
            count when billing is on.
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLAN_NAMES.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            table={table}
            saved={saved}
            paidOnly={paidOnly}
            everyoneNow={!billingOn && plan === "ELITE"}
            onLimit={setLimit}
            onFlag={setFlag}
          />
        ))}
      </div>
      <p className="text-small text-ink-muted">
        Leave a box empty for no limit. Saved changes reach everyone within 30
        seconds.
      </p>

      {changed === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="mr-auto text-small text-ink-muted">
            Everything is saved.
          </p>
          <Button
            variant="ghost"
            disabled={pending || atDefaults}
            onClick={() => setTable(defaults)}
          >
            Fill in the defaults
          </Button>
        </div>
      ) : (
        // Only while something is unsaved: one line, held at the foot of the screen.
        <div className="sticky bottom-3 z-10 flex items-center gap-2 rounded-card border border-accent/40 bg-surface p-2 pl-4 shadow-lg">
          <p role="status" className="mr-auto text-small text-ink">
            {changed} unsaved
            <span className="hidden sm:inline">
              {changed === 1 ? " change" : " changes"}
            </span>
          </p>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => setTable(saved)}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => {
              const next = table;
              save(overrides(), "Plans saved", {
                saved: () => setSaved(next),
              });
            }}
          >
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save changes</span>
          </Button>
        </div>
      )}
    </div>
  );
}
