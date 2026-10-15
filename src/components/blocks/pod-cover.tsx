import { Check } from "lucide-react";

import {
  COVER_GRAIN,
  initialsOf,
  meshBackground,
  meshCss,
  type Mesh,
  type PodCover as Cover,
} from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

/** A mesh gradient with the film grain over it. Decorative on its own. */
export function MeshArt({
  mesh,
  className,
}: {
  mesh: Mesh | string;
  className?: string;
}) {
  return (
    <span
      className={cn("relative block size-full", className)}
      style={{ background: typeof mesh === "string" ? mesh : meshCss(mesh) }}
    >
      <span
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: COVER_GRAIN }}
      />
    </span>
  );
}

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
        <MeshArt mesh={meshBackground(cover.preset)} />
      )}
    </span>
  );
}

/**
 * A pod's face in a list: its cover as a small square with the name's initials. A done
 * pod gets a check in the corner. Decorative; the name sits beside it.
 */
export function PodMark({
  cover,
  name,
  done = false,
  className,
}: {
  cover: Cover;
  name: string;
  done?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative grid size-10 shrink-0 place-items-center", className)}
    >
      <PodCover cover={cover} className="absolute inset-0 rounded-[10px]" />
      <span className="relative font-heading text-small font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
        {initialsOf(name)}
      </span>
      {done ? (
        <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-success text-surface ring-2 ring-surface">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}
