import { formatUsd } from "@/lib/admin/format";
import type { adminService } from "@/server/services/admin";

type Usage = Awaited<ReturnType<typeof adminService.aiUsage>>;

/** What the AI cost this month, per job, model and prompt version (from AiUsage). */
export function AiUsage({ usage }: { usage: Usage }) {
  const total = usage.reduce((sum, u) => sum + (u._sum.costMicros ?? 0), 0);
  return (
    <section
      id="cost"
      aria-labelledby="cost-title"
      className="flex scroll-mt-6 flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cost-title" className="text-h2">
          Cost this month
        </h2>
        {usage.length ? (
          <span className="font-mono text-body tabular-nums">
            {formatUsd(total)}
          </span>
        ) : null}
      </div>
      {usage.length === 0 ? (
        <p className="text-body text-ink-muted">No AI calls this month.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {usage.map((u) => (
            <li
              key={`${u.provider}-${u.model}-${u.promptVersion}-${u.purpose}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-medium first-letter:uppercase">
                  {u.purpose.toLowerCase().replace(/_/g, " ")}
                </span>
                <span className="font-mono text-small text-ink-muted">
                  {u.provider} · {u.model} · {u.promptVersion}
                </span>
              </span>
              <span className="font-mono text-small text-ink-muted tabular-nums">
                {u._count} calls ·{" "}
                {(
                  (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0)
                ).toLocaleString("en-IN")}{" "}
                tokens
              </span>
              <span className="font-mono text-body tabular-nums">
                {formatUsd(u._sum.costMicros ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
