import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt = "A plan you can actually finish";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "A plan you can actually finish",
    "Why Study planner exists and who builds it.",
  );
}
