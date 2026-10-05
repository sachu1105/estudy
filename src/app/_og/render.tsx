import { ImageResponse } from "next/og";

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
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "#3B5BFD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          >
            <path
              d="M4 10.5 8 14.5 16 5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: 34, fontWeight: 600 }}>Study planner</div>
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
