import { z } from "zod";

/**
 * Pod covers: the art at the top of a pod's card. Automatic by default (a grainy gradient
 * picked from the pod's id, so it never changes between visits); the user can choose
 * another gradient or upload an image instead.
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

/** A cover as it's saved (Pod.cover, ExamCover.cover). Images are private keys. */
export const storedCoverSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("gradient"),
    preset: z.enum(NAMES as [CoverPreset, ...CoverPreset[]]),
  }),
  z.object({
    kind: z.literal("image"),
    key: z.string().max(200),
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  }),
]);
export type StoredCover = z.infer<typeof storedCoverSchema>;

/** What the picker sends: automatic again, a preset, or an image just uploaded. */
export const coverChoiceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }),
  z.object({
    kind: z.literal("gradient"),
    preset: z.enum(NAMES as [CoverPreset, ...CoverPreset[]]),
  }),
  z.object({ kind: z.literal("image"), key: z.string().max(200) }),
]);
export type CoverChoice = z.infer<typeof coverChoiceSchema>;

/** Which option the picker shows as chosen. */
export function selectionOf(
  stored: StoredCover | null,
): "auto" | CoverPreset | "image" {
  if (!stored) return "auto";
  return stored.kind === "gradient" ? stored.preset : "image";
}

/** Reads a saved cover; anything unreadable falls back to automatic. */
export function parseStoredCover(value: unknown): StoredCover | null {
  const parsed = storedCoverSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
