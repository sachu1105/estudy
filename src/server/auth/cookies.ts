import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./tokens";

export const ACCESS_COOKIE = "sp_access";
export const REFRESH_COOKIE = "sp_refresh";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

/** Both next/headers cookies() and NextResponse.cookies satisfy this. */
export interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown;
}

export type SessionTokens = { accessToken: string; refreshToken?: string };

// Secure everywhere except plain-http local development (Safari drops Secure cookies on
// http://localhost). Production always runs behind https.
function isSecure() {
  return (
    process.env.NODE_ENV === "production" ||
    (process.env.APP_URL ?? "").startsWith("https://")
  );
}

function options(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function writeSessionCookies(
  cookies: CookieWriter,
  tokens: SessionTokens,
) {
  cookies.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    options(ACCESS_TOKEN_TTL_SECONDS),
  );
  if (tokens.refreshToken) {
    cookies.set(
      REFRESH_COOKIE,
      tokens.refreshToken,
      options(REFRESH_TOKEN_TTL_SECONDS),
    );
  }
}

export function clearSessionCookies(cookies: CookieWriter) {
  cookies.set(ACCESS_COOKIE, "", options(0));
  cookies.set(REFRESH_COOKIE, "", options(0));
}
