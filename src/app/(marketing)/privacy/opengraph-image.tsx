import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt = "Privacy policy";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "Privacy policy",
    "What we collect, how we use it, and what we never do.",
  );
}
