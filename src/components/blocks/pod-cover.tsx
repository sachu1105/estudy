import {
  COVER_GRAIN,
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
