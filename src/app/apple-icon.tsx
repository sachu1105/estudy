import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#3B5BFD",
      }}
    >
      <svg
        width="104"
        height="104"
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
    </div>,
    size,
  );
}
