import { Avatar } from "@/components/ui/avatar";
import { rupees } from "@/lib/pricing/pricing";
import { passDate } from "@/lib/squads/pay";

/** What the squad has taken in, and who paid lately. Its owner's eyes only. */
export function SalesPanel({
  sales,
}: {
  sales: {
    totalPaise: number;
    count: number;
    recent: {
      id: string;
      amountPaise: number;
      provider: "DEMO" | "RAZORPAY";
      accessUntil: Date | null;
      createdAt: Date;
      user: { id: string; displayName: string; avatarUrl: string | null };
      channel: { name: string } | null;
    }[];
  };
}) {
  return (
    <section aria-labelledby="sales" className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="sales" className="text-h3">
          Passes sold
        </h2>
        <p className="text-small text-ink-muted">
          <span className="font-mono font-medium text-ink tabular-nums">
            {rupees(sales.totalPaise)}
          </span>{" "}
          from {sales.count} pass{sales.count === 1 ? "" : "es"}, demo payments
        </p>
      </div>
      {sales.recent.length ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {sales.recent.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar
                name={s.user.displayName}
                src={s.user.avatarUrl}
                size="sm"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body">{s.user.displayName}</span>
                <span className="truncate text-small text-ink-muted">
                  {s.channel ? `#${s.channel.name}` : "Squad pass"} ·{" "}
                  {passDate(s.createdAt)}
                  {s.accessUntil ? ` · until ${passDate(s.accessUntil)}` : ""}
                </span>
              </span>
              <span className="font-mono text-body tabular-nums">
                {rupees(s.amountPaise)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-border p-4 text-small text-ink-muted">
          No passes sold yet. Share the squad&apos;s link so people find it.
        </p>
      )}
    </section>
  );
}
