import { coverFor, parseStoredCover, type PodCover } from "@/lib/pods/covers";

/**
 * The art a squad draws with: the banner its admins chose, or an automatic gradient
 * picked from its id so every squad still looks like itself.
 *
 * Uploaded banners are served through `/api/squad-image`, which checks who may see them
 * and redirects to a short-lived signed link. The version is the tail of the storage
 * key, so a new banner is never masked by a cached old one.
 */
export function squadCover(group: { id: string; cover?: unknown }): PodCover {
  const stored = parseStoredCover(group.cover);
  if (!stored) return coverFor(group.id);
  if (stored.kind === "gradient") return stored;
  return {
    kind: "image",
    url: `/api/squad-image/${group.id}?v=${stored.key.slice(-8)}`,
  };
}
