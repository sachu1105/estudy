import { describe, expect, it, vi } from "vitest";

import {
  assertPublicUrl,
  fetchLinkMeta,
  isPrivateAddress,
  parseMeta,
  UnsafeUrlError,
} from "./fetch-meta";

describe("link previews", () => {
  it("knows private and reserved addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.9",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ])
      expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "142.250.1.1", "2606:4700::1111"])
      expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("refuses unsafe links before fetching anything", async () => {
    for (const url of [
      "file:///etc/passwd",
      "http://127.0.0.1/admin",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "https://user:pass@example.com/",
      "http://example.com:8080/",
      "not a url",
    ])
      await expect(assertPublicUrl(url), url).rejects.toBeInstanceOf(
        UnsafeUrlError,
      );
  });

  it("reads the title, description and icon from a page head", () => {
    const meta = parseMeta(
      `<html><head><title>Kerala PSC &amp; you</title>
       <meta name="description" content="Notes on the &quot;renaissance&quot;">
       <link rel="shortcut icon" href="/static/icon.png"></head></html>`,
      "https://example.org/notes/page",
    );
    expect(meta).toEqual({
      title: "Kerala PSC & you",
      description: 'Notes on the "renaissance"',
      faviconUrl: "https://example.org/static/icon.png",
    });
    expect(
      parseMeta(
        '<meta property="og:title" content="OG title"><title>t</title>',
        "https://a.org",
      ).title,
    ).toBe("OG title");
  });

  it("checks every redirect hop, so a public link can't bounce into the network", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/" },
        }),
    );
    await expect(
      fetchLinkMeta("http://93.184.216.34/", fetchMock),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a safe redirect and reads the page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: "/final" } }),
      )
      .mockResolvedValueOnce(
        new Response("<title>Final page</title>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    const meta = await fetchLinkMeta("http://93.184.216.34/start", fetchMock);
    expect(meta).toMatchObject({
      title: "Final page",
      finalUrl: "http://93.184.216.34/final",
    });
  });
});
