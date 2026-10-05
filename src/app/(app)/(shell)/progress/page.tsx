import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <PlaceholderPage
      title="Progress"
      description="Minutes, coverage and accuracy over time."
      milestone="milestone 9"
    />
  );
}
