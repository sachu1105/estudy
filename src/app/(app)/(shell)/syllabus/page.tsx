import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Syllabus" };

export default function SyllabusPage() {
  return (
    <PlaceholderPage
      title="Syllabus"
      description="Subjects and topics, with how far you've covered each."
      milestone="milestone 6"
    />
  );
}
