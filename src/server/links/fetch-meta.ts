import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a link's title, description and icon on the server, safely (SSRF): only http(s)
// on standard ports, every address the name resolves to must be public, redirects are
// followed by hand and checked again, 5 s timeout, at most 1 MB read. The page is only
// read for text; nothing from it is ever rendered as HTML.

export type LinkMeta = {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  finalUrl: string;
};

const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

export class UnsafeUrlError extends Error {}

function v4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** Loopback, private, link-local, CGNAT, multicast and reserved ranges, v4 and v6. */
export function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) return v4Private(ip);
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return v4Private(mapped[1]);
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

/** Throws UnsafeUrlError unless the URL is http(s), credential-free and fully public. */
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That isn't a web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new UnsafeUrlError("Only http and https links can be added.");
  if (url.username || url.password)
    throw new UnsafeUrlError(
      "Links with a username or password can't be added.",
    );
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new UnsafeUrlError("Only links on standard ports can be added.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0)
    throw new UnsafeUrlError("That site can't be found.");
  if (addresses.some(isPrivateAddress))
    throw new UnsafeUrlError("Links to private networks can't be added.");
  return url;
}

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = /\b(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) return decode(content);
  }
  return null;
}

/** Title, description and icon from a page's head. Pure, so it can be tested. */
export function parseMeta(
  html: string,
  pageUrl: string,
): Omit<LinkMeta, "finalUrl"> {
  const head = html.slice(0, 200_000);
  const title =
    metaContent(head, "og:title") ??
    (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]
      ? decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)![1])
      : null);
  const description =
    metaContent(head, "og:description") ?? metaContent(head, "description");
  const iconTag = (head.match(/<link\b[^>]*>/gi) ?? []).find((t) =>
    /\brel\s*=\s*["'][^"']*\bicon\b/i.test(t),
  );
  const iconHref =
    iconTag && /\bhref\s*=\s*["']([^"']+)["']/i.exec(iconTag)?.[1];
  let faviconUrl: string | null = null;
  try {
    const icon = new URL(iconHref ?? "/favicon.ico", pageUrl);
    if (icon.protocol === "https:" || icon.protocol === "http:")
      faviconUrl = icon.href;
  } catch {}
  return {
    title: title ? title.slice(0, 300) : null,
    description: description ? description.slice(0, 500) : null,
    faviconUrl,
  };
}

async function readCapped(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks).subarray(0, MAX_BYTES),
  );
}

export async function fetchLinkMeta(
  raw: string,
  doFetch: typeof fetch = fetch,
): Promise<LinkMeta> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await doFetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "StudyPlannerLinkPreview/1.0",
        Accept: "text/html",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error(`The page answered ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    const html = type.includes("html") ? await readCapped(response) : "";
    return { ...parseMeta(html, url.href), finalUrl: url.href };
  }
  throw new Error("Too many redirects.");
}
