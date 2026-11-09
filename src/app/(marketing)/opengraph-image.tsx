import { ogContentType, ogSize, renderOg } from "@/app/_og/render";
import { site } from "@/lib/site";

export const alt = site.tagline;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    site.tagline,
    "For competitive exam aspirants. Free during launch.",
  );
}
