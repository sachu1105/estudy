import type { CSSProperties } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Magic UI's glare hover (magicui.design/docs/components/glare-hover) as an overlay, not a
 * wrapper, so it can sit inside a card that is itself a grid item (the plan cards are a
 * subgrid). A narrow, slanted band of light slides across the card while it is hovered or
 * holds focus, and back when it leaves. Magic UI stretches a gradient over the card,
 * which smears on tall cards; a band that moves keeps its shape on any card. CSS only.
 * White light vanishes on a white card, so in the light theme the band is a faint wash
 * of the accent instead; in the dark theme it is white.
 *
 * The host needs `glareHost`: positioned, clipped to its radius, and the hover group.
 * Off for reduced motion.
 */
export const glareHost = "group/glare relative isolate overflow-hidden";

export function Glare({
  duration = 650,
  className,
}: {
  /** Milliseconds for one sweep. */
  duration?: number;
  className?: string;
}) {
  return (
    // The track is as wide as the card and travels from one card-width left of it to one
    // right of it, so the band (slanted, its reach under a card-width) is out of sight at
    // both ends.
    <span
      aria-hidden
      style={{ transitionDuration: `${duration}ms` } as CSSProperties}
      className={cn(
        "pointer-events-none absolute inset-0 z-10 -translate-x-[150%] transition-[translate] ease-[ease] motion-reduce:hidden",
        "group-focus-within/glare:translate-x-[150%] group-hover/glare:translate-x-[150%]",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-1/2 w-1/4 -translate-x-1/2 -skew-x-[20deg] bg-linear-to-r from-transparent via-accent/15 to-transparent dark:via-white/35" />
    </span>
  );
}
