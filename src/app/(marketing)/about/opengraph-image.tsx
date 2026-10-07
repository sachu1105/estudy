import { ogContentType, ogSize, renderOg } from "@/app/_og/render";
import { site } from "@/lib/site";

export const alt = "A plan you can actually finish";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "A plan you can actually finish",
    `Why ${site.name} exists and who builds it.`,
  );
}
