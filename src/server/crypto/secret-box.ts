import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Seals secrets an admin saves (the AI API key) before they reach the database: AES-256-GCM
// under a key derived from AI_SECRET_KEY, which lives only in the server's environment. A
// database dump alone never reveals the key. Pure (the master secret is a parameter).

const VERSION = "v1";

const keyFrom = (master: string) =>
  createHash("sha256").update(`studypods:secret-box:${master}`).digest();

export function seal(plain: string, master: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(master), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), body]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

/** The plain secret, or null when it was sealed under another master key or tampered with. */
export function open(sealed: string, master: string): string | null {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFrom(master),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** What the admin sees of a saved key: its last four characters. */
export const hintOf = (secret: string) => `…${secret.trim().slice(-4)}`;
