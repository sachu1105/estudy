import "server-only";

import { assertPublicUrl } from "@/server/links/fetch-meta";
import { env } from "@/server/env";

// Fetching a board's public pages, politely: only public addresses (SSRF-safe), a
// handful of redirects, a size cap, a timeout, a name that says who we are, and
// whatever the site's robots.txt asks.

const TIMEOUT_MS = 60_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = `studypodsExamDates/1.0 (+${env.APP_URL})`;

async function readCapped(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`The file is over ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function get(raw: string, accept: string, maxBytes: number) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: accept },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error(`${url.host} answered ${response.status}.`);
    return {
      url: url.href,
      type: response.headers.get("content-type") ?? "",
      bytes: await readCapped(response, maxBytes),
    };
  }
  throw new Error("Too many redirects.");
}

/** The paths robots.txt keeps every crawler out of. */
export function disallowed(robots: string) {
  const paths: string[] = [];
  let forAll = false;
  for (const line of robots.split(/\r?\n/)) {
    const [key, ...rest] = line.replace(/#.*/, "").split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key?.trim() ?? "")) forAll = value === "*";
    else if (forAll && /^disallow$/i.test(key?.trim() ?? "") && value)
      paths.push(value);
  }
  return paths;
}

/** Whether the site's robots.txt lets us read this address (no robots.txt: yes). */
async function robotsAllow(url: URL) {
  try {
    const { bytes } = await get(`${url.origin}/robots.txt`, "text/plain", 200_000);
    const rules = disallowed(new TextDecoder().decode(bytes));
    return !rules.some((path) => url.pathname.startsWith(path.replace(/\*.*$/, "")));
  } catch {
    return true;
  }
}

/** A board's page, as text. */
export async function fetchPage(raw: string) {
  const url = new URL(raw);
  if (!(await robotsAllow(url)))
    throw new Error(`${url.host}'s robots.txt asks not to read this page.`);
  const page = await get(raw, "text/html", 3 * 1024 * 1024);
  return new TextDecoder("utf-8", { fatal: false }).decode(page.bytes);
}

/** A programme PDF (25 MB at most). */
export async function fetchPdf(raw: string) {
  const url = new URL(raw);
  if (!(await robotsAllow(url)))
    throw new Error(`${url.host}'s robots.txt asks not to read this file.`);
  const file = await get(raw, "application/pdf", 25 * 1024 * 1024);
  if (!new TextDecoder().decode(file.bytes.subarray(0, 5)).startsWith("%PDF"))
    throw new Error("That link isn't a PDF.");
  return file.bytes;
}
