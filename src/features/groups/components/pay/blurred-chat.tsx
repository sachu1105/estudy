import { cn } from "@/lib/utils/cn";

/** Line widths for the stand-in messages: varied, like a real conversation. */
const ROWS = [
  [62, 38],
  [80],
  [45, 70, 30],
  [55],
  [74, 48],
  [36],
  [68, 52],
  [84, 40],
  [50],
  [66, 28],
];

/**
 * A chat-shaped shape behind a locked channel, blurred. Only shapes: none of the
 * channel's messages reach someone without a pass, so nothing real is drawn here.
 */
export function BlurredChat({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex flex-col gap-5 overflow-hidden px-2 blur-[5px] select-none",
        // Fades out toward the bottom, so the card reads as sitting on the channel.
        "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
        className,
      )}
    >
      {ROWS.map((lines, i) => (
        <div key={i} className="flex gap-3">
          <span className="size-9 shrink-0 rounded-full bg-surface-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <span className="h-3 w-24 rounded-full bg-ink-subtle/50" />
            {lines.map((w, j) => (
              <span
                key={j}
                className="h-3 rounded-full bg-ink-subtle/25"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
