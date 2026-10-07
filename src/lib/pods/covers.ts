/**
 * Pod covers: the art at the top of a pod's card. A soft, grainy gradient for now, picked
 * from the pod's id so it never changes between visits. Users will later choose their own
 * gradient or upload an image; `PodCover` already draws both.
 *
 * The one place gradients are allowed besides the streak glow (owner's call, 2026-10-07).
 */
export type PodCover =
  { kind: "gradient"; preset: CoverPreset } | { kind: "image"; url: string };

type Mesh = {
  /** The colour under everything. */
  base: string;
  /** Three soft blobs, top-left, right and bottom. */
  blobs: [string, string, string];
};

export const COVER_PRESETS = {
  meadow: { base: "#1c8f4f", blobs: ["#7ddc6c", "#0f7a6e", "#3bbf62"] },
  ember: { base: "#3a0c06", blobs: ["#ff6a2b", "#d01f1f", "#ffb08a"] },
  blurple: { base: "#3c45a5", blobs: ["#8b93ff", "#5865f2", "#c3c8fb"] },
  ocean: { base: "#0b3b6e", blobs: ["#38bdf8", "#1e40af", "#5eead4"] },
  dusk: { base: "#4c1d95", blobs: ["#f472b6", "#7c3aed", "#fb7185"] },
  moss: { base: "#24372a", blobs: ["#a3c48a", "#4d7c5a", "#d9e4c8"] },
} satisfies Record<string, Mesh>;

export type CoverPreset = keyof typeof COVER_PRESETS;

const NAMES = Object.keys(COVER_PRESETS) as CoverPreset[];

/** A stable preset for an id: the same pod always gets the same cover. */
export function coverFor(id: string): PodCover {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return { kind: "gradient", preset: NAMES[Math.abs(hash) % NAMES.length]! };
}

/** The CSS background for a preset: three radial blobs over a base colour. */
export function meshBackground(preset: CoverPreset) {
  const { base, blobs } = COVER_PRESETS[preset];
  return [
    `radial-gradient(60% 80% at 15% 20%, ${blobs[0]} 0%, transparent 70%)`,
    `radial-gradient(55% 75% at 90% 30%, ${blobs[1]} 0%, transparent 70%)`,
    `radial-gradient(70% 60% at 50% 110%, ${blobs[2]} 0%, transparent 70%)`,
    base,
  ].join(", ");
}
