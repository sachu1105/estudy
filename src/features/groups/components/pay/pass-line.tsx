import { passDate } from "@/lib/squads/pay";

/** "Squad pass until 28 Nov 2026 · #kerala-history for good": what someone paid for. */
export function PassLine({
  passes,
}: {
  passes: { channel: string | null; until: Date | null }[];
}) {
  return (
    <span className="text-small text-ink-muted">
      {passes
        .map(
          (p) =>
            `${p.channel ? `#${p.channel}` : "Squad pass"} ${
              p.until ? `until ${passDate(p.until)}` : "for good"
            }`,
        )
        .join(" · ")}
    </span>
  );
}
