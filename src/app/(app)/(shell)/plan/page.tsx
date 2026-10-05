import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <PlaceholderPage
      title="Plan"
      description="Your day-by-day study plan, grouped by week."
      milestone="milestone 6"
    />
  );
}
