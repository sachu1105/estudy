import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const roleSchema = z.enum(["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]);

const accessClaimsSchema = z.object({
  sub: z.uuid(),
  role: roleSchema,
  /** Refresh-token family this access token was minted from (one per login). */
  sid: z.uuid(),
});

export type AccessClaims = z.infer<typeof accessClaimsSchema>;

const ISSUER = "studyplanner";
const encoder = new TextEncoder();

export async function signAccessToken(
  claims: AccessClaims,
  secret: string,
  now: Date,
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role: claims.role, sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ACCESS_TOKEN_TTL_SECONDS)
    .sign(encoder.encode(secret));
}

/** Returns the claims, or null for any invalid, expired or tampered token. */
export async function verifyAccessToken(
  token: string | undefined,
  secret: string,
  now: Date,
): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      issuer: ISSUER,
      algorithms: ["HS256"],
      currentDate: now,
    });
    const parsed = accessClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Opaque, high-entropy token for refresh, email verification and password reset links. */
export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored, so a database leak does not leak usable tokens. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
