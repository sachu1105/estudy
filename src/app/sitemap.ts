import type { MetadataRoute } from "next";

import { env } from "@/server/env";

const publicPaths = [
  "",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/register",
  "/login",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: `${env.APP_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
