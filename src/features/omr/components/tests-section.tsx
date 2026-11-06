import type { ReactNode } from "react";

/** A part of the Tests page: its heading, a line on what's in it, then its cards. */
export function Section({
  id,
  title,
  detail,
  children,
}: {
  id: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="font-heading text-h2 font-semibold">
          {title}
        </h2>
        <p className="text-small text-ink-muted">{detail}</p>
      </div>
      {children}
    </section>
  );
}
