import { Construction } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { PageHeader } from "./page-header";

type PlaceholderPageProps = {
  title: string;
  description: string;
  milestone: string;
};

/** Stand-in for routes whose feature arrives in a later milestone. */
export function PlaceholderPage({
  title,
  description,
  milestone,
}: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Coming soon"
        description={`This screen is built in ${milestone}.`}
      />
    </>
  );
}
