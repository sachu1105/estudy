const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for state-changing route handlers. Server actions get Next's built-in
 * origin check; route handlers call this. Cookies are SameSite=Lax as a second layer.
 */
export function isSameOrigin(request: Request, appUrl: string) {
  if (SAFE_METHODS.has(request.method)) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    return false;

  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === "same-origin";

  const allowed = new Set([
    new URL(appUrl).origin,
    new URL(request.url).origin,
  ]);
  return allowed.has(origin);
}
