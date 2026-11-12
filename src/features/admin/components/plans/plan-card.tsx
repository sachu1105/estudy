"use client";

import { Badge } from "@/components/ui/badge";
import { planLabel } from "@/lib/pricing/pricing";

import { FlagRow, LimitCell } from "./plan-cells";
import {
  ROWS,
  inGb,
  isBytes,
  type Flag,
  type Limit,
  type Plan,
  type PlanTable,
} from "./plan-rows";

const PaidOnly = () => <Badge tone="outline">Paid only</Badge>;

/**
 * One plan, as a card: each limit with its box, then the on/off features. While billing
 * is off the Elite card says it is what everyone has.
 */
export function PlanCard({
  plan,
  table,
  saved,
  paidOnly,
  everyoneNow,
  onLimit,
  onFlag,
}: {
  plan: Plan;
  table: PlanTable;
  saved: PlanTable;
  paidOnly: readonly string[];
  everyoneNow: boolean;
  onLimit: (plan: Plan, f: Limit, raw: string) => void;
  onFlag: (plan: Plan, f: Flag, on: boolean) => void;
}) {
  const name = planLabel(plan);
  return (
    <section
      aria-label={name}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-h3">{name}</h3>
        {everyoneNow ? (
          <Badge tone="accent">Everyone has this now</Badge>
        ) : null}
      </div>

      {ROWS.map((row) =>
        row.kind === "limit" ? (
          <div
            key={row.feature}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink">
              {row.label}
              {row.unit ? (
                <span className="text-ink-muted">{row.unit}</span>
              ) : null}
              {/* Beside the label, not under the box, so the cards' rows stay level. */}
              {isBytes(row.feature) && inGb(table[plan].limits[row.feature]) ? (
                <span className="text-ink-muted tabular-nums">
                  · {inGb(table[plan].limits[row.feature])}
                </span>
              ) : null}
              {paidOnly.includes(row.feature) ? <PaidOnly /> : null}
            </span>
            <div className="w-28 shrink-0">
              <LimitCell
                feature={row.feature}
                label={`${row.label}, ${name}`}
                value={table[plan].limits[row.feature]}
                saved={saved[plan].limits[row.feature]}
                onChange={(raw) => onLimit(plan, row.feature, raw)}
              />
            </div>
          </div>
        ) : null,
      )}

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        {ROWS.map((row) =>
          row.kind === "flag" ? (
            <FlagRow
              key={row.feature}
              on={table[plan].flags[row.feature]}
              saved={saved[plan].flags[row.feature]}
              onChange={(on) => onFlag(plan, row.feature, on)}
            >
              {row.label}
              {paidOnly.includes(row.feature) ? <PaidOnly /> : null}
            </FlagRow>
          ) : null,
        )}
      </div>
    </section>
  );
}
