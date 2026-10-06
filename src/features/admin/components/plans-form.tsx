"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import {
  FLAG_FEATURES,
  LIMIT_FEATURES,
  PLAN_NAMES,
  type SettingValue,
} from "@/lib/settings/schemas";

import { useSaveSetting } from "./use-save-setting";

type Plan = (typeof PLAN_NAMES)[number];
type Limit = (typeof LIMIT_FEATURES)[number];
type Flag = (typeof FLAG_FEATURES)[number];
/** null = unlimited. */
export type PlanTable = Record<
  Plan,
  { limits: Record<Limit, number | null>; flags: Record<Flag, boolean> }
>;

const MB = 1024 * 1024;
const isBytes = (f: Limit) => f.endsWith("Bytes");
/** Names users know (sentence case): the code's "vault" is the pods of the app. */
const LABELS: Record<Limit | Flag, string> = {
  syllabusUploads: "Syllabus uploads",
  activePlans: "Active study plans",
  afterTaskMocksPerDay: "Check tests a day",
  sectionMocksPerWeek: "Section and full mocks a week",
  groupsCreated: "Groups created",
  groupsJoined: "Groups joined",
  groupStorageBytes: "Group storage (MB)",
  vaultStorageBytes: "Pod storage (MB)",
  vaultFolders: "Pods",
  vaultMocksPerMonth: "Mocks from my material a month",
  pagesPerVaultMock: "Pages per material mock",
  aiExplanations: "AI answer explanations",
  fullAnalytics: "Full analytics",
  topperComparison: "Topper comparison",
  priorityParsing: "Priority syllabus reading",
};
const label = (f: Limit | Flag) => LABELS[f];

/** The plans table, editable. Only what differs from the built-in defaults is saved. */
export function PlansForm({
  initial,
  defaults,
}: {
  initial: PlanTable;
  defaults: PlanTable;
}) {
  const [table, setTable] = useState(initial);
  const { save, pending } = useSaveSetting("entitlements");

  const setLimit = (plan: Plan, f: Limit, raw: string) => {
    const n =
      raw.trim() === ""
        ? null
        : Math.max(0, Math.round(Number(raw) * (isBytes(f) ? MB : 1)));
    setTable((t) => ({
      ...t,
      [plan]: {
        ...t[plan],
        limits: { ...t[plan].limits, [f]: Number.isFinite(n) ? n : null },
      },
    }));
  };
  const setFlag = (plan: Plan, f: Flag, on: boolean) =>
    setTable((t) => ({
      ...t,
      [plan]: { ...t[plan], flags: { ...t[plan].flags, [f]: on } },
    }));

  const changes = (): SettingValue<"entitlements"> =>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLAN_NAMES.map((plan) => (
          <section
            key={plan}
            aria-label={plan}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <h2 className="text-h3">{plan.toLowerCase()}</h2>
            {LIMIT_FEATURES.map((f) => {
              const value = table[plan].limits[f];
              const id = `${plan}-${f}`;
              return (
                <div
                  key={f}
                  className="flex items-center justify-between gap-3"
                >
                  <Label htmlFor={id} className="text-small font-normal">
                    {label(f)}
                  </Label>
                  <Input
                    id={id}
                    inputMode="numeric"
                    className="w-28 text-right"
                    placeholder="No limit"
                    value={
                      value === null
                        ? ""
                        : String(isBytes(f) ? Math.round(value / MB) : value)
                    }
                    onChange={(e) => setLimit(plan, f, e.target.value)}
                  />
                </div>
              );
            })}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {FLAG_FEATURES.map((f) => (
                <label
                  key={f}
                  className="flex min-h-11 items-center gap-3 text-small md:min-h-0"
                >
                  <Checkbox
                    checked={table[plan].flags[f]}
                    onCheckedChange={(v) => setFlag(plan, f, v === true)}
                  />
                  {label(f)}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => save(changes(), "Plans saved")}
        >
          Save plans
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => setTable(defaults)}
        >
          Back to defaults
        </Button>
      </div>
      <p className="text-small text-ink-muted">
        Leave a limit empty for no limit. Changes reach every user within 30
        seconds.
      </p>
    </div>
  );
}
