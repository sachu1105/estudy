import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Users, catalogue, question pool, groups, jobs and the audit log."
      milestone="milestone 12"
    />
  );
}
