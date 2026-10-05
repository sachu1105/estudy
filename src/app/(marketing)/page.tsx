import type { Metadata } from "next";

import { ExamStrip } from "@/features/marketing/components/exam-strip";
import { Faq, faqs } from "@/features/marketing/components/faq";
import { FeaturesBento } from "@/features/marketing/components/features-bento";
import { FinalCta } from "@/features/marketing/components/final-cta";
import { GroupsSection } from "@/features/marketing/components/groups-section";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { PricingTeaser } from "@/features/marketing/components/pricing-teaser";
import { ctaHref } from "@/features/marketing/components/section-heading";
import { site } from "@/lib/site";
import { hasSession } from "@/server/auth/session";
import { billingEnabled } from "@/server/entitlements";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: daily plans for Kerala PSC, SSC and RRB` },
  description: site.description,
  alternates: { canonical: "/" },
};

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, Android, iOS",
      description: site.description,
      url: env.APP_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: site.company },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default async function LandingPage() {
  const signedIn = await hasSession();
  const href = ctaHref(signedIn);

  return (
    <>
      <JsonLd />
      <Hero signedIn={signedIn} />
      <ExamStrip />
      <FeaturesBento />
      <HowItWorks />
      <GroupsSection />
      <PricingTeaser billingEnabled={billingEnabled} ctaHref={href} />
      <Faq />
      <FinalCta href={href} />
    </>
  );
}
