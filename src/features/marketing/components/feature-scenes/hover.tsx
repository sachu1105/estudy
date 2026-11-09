import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// The features' pictures move a little while their cell is hovered (the cell is
// `group/feature`). Hover only fires on a pointer that can hover, so phones keep the still
// picture. Moves are `motion-safe:` only; state changes (a tick, a pen mark) still show
// under reduced motion, without the travel.

/** The timing every hover move shares: unhurried, in the house ease. */
export const glide =
  "transition-[translate,rotate,scale,opacity,box-shadow,background-color,border-color,color] duration-500 ease-out motion-reduce:transition-none";

/** Lands after the glide has started, so the eye follows one thing at a time. */
export const after = "group-hover/feature:delay-300";

/**
 * A task box. `done` is ticked at rest; `later` ticks itself while the cell is hovered,
 * the check scaling in like the app's own task checkbox.
 */
export function SceneTick({
  done = false,
  later = false,
  className,
  iconClassName,
}: {
  done?: boolean;
  later?: boolean;
  className: string;
  iconClassName: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border",
        glide,
        done ? "border-success bg-success text-white" : "border-edge",
        later &&
          cn(
            after,
            "group-hover/feature:border-success group-hover/feature:bg-success group-hover/feature:text-white",
          ),
        className,
      )}
    >
      {done || later ? (
        <Check
          className={cn(
            iconClassName,
            later &&
              cn(
                glide,
                after,
                "scale-50 opacity-0 group-hover/feature:scale-100 group-hover/feature:opacity-100",
              ),
          )}
        />
      ) : null}
    </span>
  );
}
