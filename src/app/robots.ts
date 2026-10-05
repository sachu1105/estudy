import type { MetadataRoute } from "next";

import { env } from "@/server/env";

// The app itself is private; only the marketing and auth pages are for search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dev/",
        "/today",
        "/plan",
        "/calendar",
        "/syllabus",
        "/tests",
        "/groups",
        "/rank",
        "/progress",
        "/settings",
        "/onboarding",
      ],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
