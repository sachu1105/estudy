type HeaderReader = { get(name: string): string | null };

/** First hop of X-Forwarded-For (set by Caddy in production), else the direct peer. */
export function clientIp(store: HeaderReader) {
  const forwarded = store.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || store.get("x-real-ip") || "unknown";
}
