import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Rank" };

export default function RankPage() {
  return (
    <PlaceholderPage
      title="Rank"
      description="See where you stand among every aspirant."
      milestone="milestone 9"
    />
  );
}
