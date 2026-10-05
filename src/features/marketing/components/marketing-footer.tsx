import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { exams, site } from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Rank", href: "/rank" },
    ],
  },
  {
    title: "Exams",
    links: exams
      .slice(0, 5)
      .map((exam) => ({ label: exam, href: "/#features" })),
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

export function MarketingFooter({ year }: { year: number }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)] md:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-small text-ink-muted">
            A daily study plan for Kerala PSC, SSC and RRB aspirants, with a
            mock test after every task.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:contents">
          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex flex-col gap-3"
            >
              <p className="text-micro text-ink-muted uppercase">
                {column.title}
              </p>
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
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <p className="text-small text-ink-muted">
            © {year} {site.company}
          </p>
          <div className="flex items-center gap-3">
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
      </div>
    </footer>
  );
}
