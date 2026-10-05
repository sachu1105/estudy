import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = { title: "Get started" };

export default function OnboardingPage() {
  return (
    <PlaceholderPage
      title="Let's build your plan"
      description="Pick your exam, your timeline and how strong you are in each subject."
      milestone="milestone 5"
    />
  );
}
