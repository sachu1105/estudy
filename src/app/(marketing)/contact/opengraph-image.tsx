import { ogContentType, ogSize, renderOg } from "@/app/_og/render";

export const alt = "Contact us";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg(
    "Contact us",
    "Questions, ideas or a wrong answer? Write to us.",
  );
}
