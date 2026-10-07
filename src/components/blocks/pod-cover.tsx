import { meshBackground, type PodCover as Cover } from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

// Film grain over the gradient, so it reads as soft paint rather than a flat CSS blend.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/** A pod not made yet: soft stripes, drifting while its syllabus is being read. */
export type PlaceholderCover = { kind: "placeholder"; moving: boolean };

/** A pod's cover art: a grainy mesh gradient, or the user's own image. Decorative. */
export function PodCover({
  cover,
  className,
}: {
  cover: Cover | PlaceholderCover;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("block overflow-hidden", className)}>
      {cover.kind === "placeholder" ? (
        <span
          className={cn(
            "block size-full bg-surface-muted bg-[repeating-linear-gradient(135deg,var(--border)_0_12px,transparent_12px_24px)]",
            cover.moving && "motion-safe:animate-cover-drift",
          )}
        />
      ) : cover.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads come through signed URLs
        <img src={cover.url} alt="" className="size-full object-cover" />
      ) : (
        <span
          className="relative block size-full"
          style={{ background: meshBackground(cover.preset) }}
        >
          <span
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            style={{ backgroundImage: GRAIN }}
          />
        </span>
      )}
    </span>
  );
}
