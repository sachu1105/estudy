import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/** Makes the app installable on a phone (milestone 16). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F7F5",
    // Same as the page's themeColor in the root layout, so the status bar matches the page.
    theme_color: "#F7F7F5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "Pods", url: "/pods" },
    ],
  };
}
