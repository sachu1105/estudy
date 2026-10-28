import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { COVER_GRAIN, meshBackground } from "@/lib/pods/covers";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: `Company`,
    links: [
      { label: `About ${site.company}`, href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

/**
 * The name, huge, as the page's last word. The letters are cut out of the pod cover art
 * (CLAUDE.md allows the landing page to reuse it), so the gradient shows through them.
 * `overflow-x-clip` keeps it off the page's width without cropping the y and p tails,
 * and the padding below the line leaves those tails their room. Decorative.
 */
function Wordmark() {
  return (
    <div aria-hidden className="mt-12 overflow-x-clip select-none md:mt-16">
      <p
        className="bg-clip-text px-4 pt-[0.08em] pb-[0.2em] text-center font-heading text-[clamp(64px,17vw,260px)] leading-none font-semibold tracking-[-0.05em] text-transparent"
        style={{
          background: [COVER_GRAIN, meshBackground("blurple")].join(", "),
          // The grain is the first layer; the three mesh blobs under it stay as they are.
          backgroundBlendMode: "overlay, normal, normal, normal",
          WebkitBackgroundClip: "text",
        }}
      >
        {site.name}
      </p>
    </div>
  );
}

/**
 * Open, with no rules: the sheet above ends on its last band. The name and the copyright
 * on the left, the links on the right, then the wordmark.
 */
export function MarketingFooter({ year }: { year: number }) {
  return (
    <footer className="px-4 pt-16 md:px-8 md:pt-20">
      <div className="mx-auto grid max-w-content gap-12 md:grid-cols-[1.4fr_2fr] md:px-8">
        <div className="flex flex-col items-start gap-4">
          <Logo />
          <p className="max-w-xs text-body text-ink-muted">
            A study space for competitive exam aspirants: a pod for every
            subject, real papers to practise on, and squads to study with.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
            <p className="text-small text-ink-muted">
              © {year} {site.company}
            </p>
            {site.social.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-small text-ink-muted hover:text-ink"
                rel="me noopener"
              >
                {item.label}
              </a>
            ))}
            <ThemeToggle />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex flex-col gap-3"
            >
              <p className="text-small font-medium text-ink">{column.title}</p>
              <ul className="flex flex-col gap-1">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-block py-1.5 text-small text-ink-muted hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <Wordmark />
    </footer>
  );
}
