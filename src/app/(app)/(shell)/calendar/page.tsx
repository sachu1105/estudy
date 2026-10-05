import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PlaceholderPage
      title="Calendar"
      description="Every study day at a glance."
      milestone="milestone 6"
    />
  );
}
