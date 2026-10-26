import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/** The logo mark as a data URL: the card renders without fetching anything. */
const mark = () =>
  `data:image/png;base64,${readFileSync(join(process.cwd(), "public/logo/mark.png")).toString("base64")}`;

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Shared Open Graph card: tokens hard-coded because CSS variables don't exist here. */
export function renderOg(title: string, subtitle: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#F7F7F5",
        color: "#16161A",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain img */}
        <img src={mark()} width={64} height={64} alt="" />
        <div style={{ fontSize: 34, fontWeight: 600 }}>{site.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.15,
            maxWidth: 960,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 30, color: "#5F5F6B", maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
    </div>,
    ogSize,
  );
}
