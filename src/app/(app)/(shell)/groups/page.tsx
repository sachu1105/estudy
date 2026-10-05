import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return (
    <PlaceholderPage
      title="Groups"
      description="Study with friends: shared notes, tests and a group rank."
      milestone="milestone 10"
    />
  );
}
