import { Row, Section } from "./section";

const colours = [
  "bg",
  "surface",
  "surface-muted",
  "border",
  "ink",
  "ink-muted",
  "ink-subtle",
  "accent",
  "accent-soft",
  "accent-ink",
  "on-accent",
  "streak",
  "streak-soft",
  "streak-ink",
  "success",
  "success-soft",
  "success-ink",
  "danger",
  "danger-soft",
  "danger-ink",
];

const typeScale = [
  {
    name: "display 32/40",
    className: "font-heading text-display font-semibold",
  },
  { name: "h1 24/32", className: "font-heading text-h1 font-semibold" },
  { name: "h2 20/28", className: "font-heading text-h2 font-semibold" },
  { name: "h3 16/24", className: "font-heading text-h3 font-medium" },
  { name: "body 15/24", className: "text-body" },
  { name: "small 13/20", className: "text-small" },
  { name: "micro 11/16", className: "text-micro uppercase" },
];

export function Tokens() {
  return (
    <Section title="Tokens">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
        {colours.map((name) => (
          <div key={name} className="flex flex-col gap-1">
            <span
              className="h-10 rounded-chip border border-border"
              style={{ background: `var(--${name})` }}
            />
            <span className="truncate font-mono text-micro text-ink-muted">
              {name}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {typeScale.map((item) => (
          <div key={item.name} className="flex items-baseline gap-4">
            <span className="w-28 shrink-0 font-mono text-micro text-ink-subtle">
              {item.name}
            </span>
            <span className={item.className}>Your plan for today</span>
          </div>
        ))}
        <div className="flex items-baseline gap-4">
          <span className="w-28 shrink-0 font-mono text-micro text-ink-subtle">
            mono
          </span>
          <span className="font-mono text-h2 tabular-nums">
            24:59 · 87% · #1,204
          </span>
        </div>
      </div>
      <Row label="Radius and shadow">
        <div
          className="size-16 rounded-card border border-border bg-surface shadow-sm"
          title="card 16, sm"
        />
        <div
          className="size-16 rounded-control border border-border bg-surface shadow-md"
          title="control 12, md"
        />
        <div
          className="size-16 rounded-chip border border-border bg-surface shadow-lg"
          title="chip 8, lg"
        />
      </Row>
    </Section>
  );
}
