import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Showcase } from "./_components/showcase";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

// Dev only: every primitive in both themes, with reduced motion on and off.
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
