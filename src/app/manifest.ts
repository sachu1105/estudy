import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/** Makes the app installable on a phone (milestone 16). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Study",
    description: site.description,
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F7F5",
    theme_color: "#5865F2",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "Pods", url: "/pods" },
    ],
  };
}
