import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";

import { BootScript } from "@/components/shell/boot-script";
import { ServiceWorker } from "@/components/shell/service-worker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { site } from "@/lib/site";
import { env } from "@/server/env";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Only small numerals use mono, so it loads lazily instead of competing with the
// heading and body fonts for the first paint.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_IN" },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  // The app is light unless the user picks dark, so the OS scheme says nothing here.
  themeColor: "#F7F7F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <head>
        <BootScript />
      </head>
      <body className="min-h-dvh">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
