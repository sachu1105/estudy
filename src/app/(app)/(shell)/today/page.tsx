import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <PlaceholderPage
      title="Today"
      description="Your tasks, streak and next mock test for the day."
      milestone="milestone 6"
    />
  );
}
