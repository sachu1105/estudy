import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt =
  "Your syllabus, turned into a daily plan you can actually finish.";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "Your syllabus, turned into a daily plan you can actually finish.",
    "For Kerala PSC, SSC and RRB aspirants. Free during launch.",
  );
}
