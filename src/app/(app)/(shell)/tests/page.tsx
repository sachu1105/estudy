import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Tests" };

export default function TestsPage() {
  return (
    <PlaceholderPage
      title="Tests"
      description="Check tests, section mocks and full mocks."
      milestone="milestone 7"
    />
  );
}
