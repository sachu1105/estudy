import type { ReactNode } from "react";

type ProsePageProps = {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
};

/** Simple readable column for about, privacy, terms and contact. */
export function ProsePage({
  eyebrow,
  title,
  updated,
  children,
}: ProsePageProps) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 md:px-8 md:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-micro text-accent-ink uppercase">{eyebrow}</p>
        <h1 className="text-h1 sm:text-display">{title}</h1>
        {updated ? (
          <p className="text-small text-ink-muted">Last updated {updated}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4 text-body text-ink-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-4 [&_h2]:text-h2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </article>
  );
}
