import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt = "Terms of use";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg("Terms of use", "The rules for using Study planner.");
}
