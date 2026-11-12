import { Plus, ShoppingBag } from "lucide-react";

import { StatCell, StatStrip } from "@/components/blocks/stat-strip";
import { rupees } from "@/lib/pricing/pricing";

export type SellerStatsData = {
  have: number;
  bought: number;
  free: number;
  /** People who have it and handed in a paper from it at least once. */
  sat: number;
  sittings: number;
  grossPaise: number;
  cutPaise: number;
  earnedPaise: number;
  recent: { id: string; amountPaise: number; createdAt: Date }[];
};

/**
 * For a bundle's maker: how many have it and how they got it, how many used it, what it
 * earned, and the latest adds and sales with their times. Nobody is named: in the
 * Store, buyers are strangers to the seller.
 */
export function SellerStats({
  stats,
  timeZone,
}: {
  stats: SellerStatsData;
  timeZone: string;
}) {
  const when = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const used = stats.have ? Math.round((stats.sat / stats.have) * 100) : 0;

  return (
    <section aria-labelledby="doing" className="flex flex-col gap-3">
      <h2 id="doing" className="font-heading text-h2 font-semibold">
        How it&apos;s doing
      </h2>
      <StatStrip>
        <StatCell label="Have it" value={stats.have} hint="Bought or added" />
        <StatCell
          label="Bought"
          value={stats.bought}
          hint={
            stats.bought
              ? `${rupees(stats.earnedPaise)} yours after the Store's share`
              : "No sales yet"
          }
        />
        <StatCell label="Added free" value={stats.free} hint="To their tests" />
        <StatCell
          label="Sat a paper"
          value={stats.sat}
          bar={used}
          hint={`${used}% of them · ${stats.sittings} ${stats.sittings === 1 ? "sitting" : "sittings"}`}
        />
      </StatStrip>
      {stats.cutPaise > 0 ? (
        <p className="text-small text-ink-muted">
          Sales {rupees(stats.grossPaise)}, less studypods&apos; share{" "}
          {rupees(stats.cutPaise)}. Payments are a demo for now: no money moves.
        </p>
      ) : null}
      {stats.recent.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-4 text-center text-small text-ink-muted">
          Nobody has it yet. Adds and sales show up here with their times.
        </p>
      ) : (
        <ul
          aria-label="Latest adds and sales"
          className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface"
        >
          {stats.recent.map((r) => {
            const sale = r.amountPaise > 0;
            const Icon = sale ? ShoppingBag : Plus;
            return (
              <li
                key={r.id}
                className="flex min-h-12 items-center gap-3 px-4 py-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-body">
                  {sale ? `Bought for ${rupees(r.amountPaise)}` : "Added free"}
                </span>
                <time
                  dateTime={r.createdAt.toISOString()}
                  className="shrink-0 font-mono text-small text-ink-muted tabular-nums"
                >
                  {when.format(r.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
