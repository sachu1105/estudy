export const CHANNEL_NAME_MAX = 40;

/**
 * A channel name as it is shown and stored: lower case, words joined by single hyphens,
 * letters and digits of any script (Malayalam names work). Empty when nothing is left.
 */
export function channelName(raw: string): string {
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CHANNEL_NAME_MAX)
    .replace(/-+$/, "");
}
