/**
 * A search excerpt from Postgres with matches between « and ». Rendered as text with <mark>
 * around the matches, never as HTML.
 */
export function Snippet({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*»)/);
  return (
    <span className="line-clamp-2 text-small text-ink-muted">
      {parts.map((part, i) =>
        part.startsWith("«") ? (
          <mark
            key={i}
            className="rounded-[3px] bg-accent-soft px-0.5 text-accent-ink"
          >
            {part.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
