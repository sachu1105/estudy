import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt = "Your syllabus, one pod at a time.";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "Your syllabus, one pod at a time.",
    "For competitive exam aspirants. Free during launch.",
  );
}
