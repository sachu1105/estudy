import type { ReactNode } from "react";

/**
 * A pocket cut into a card's top-right corner, holding a small tag. The card wears its
 * outline as a ring (`ring-1 ring-border`) and doesn't clip its overflow, so the pocket
 * can paint over it in the page colour. Two quarter-round pieces turn the card's edge
 * into the pocket; the radial gradients only draw those curves.
 */
export function Notch({ children }: { children: ReactNode }) {
  const corner =
    "pointer-events-none absolute size-4 bg-[radial-gradient(circle_at_0_100%,transparent_15px,var(--border)_15px,var(--border)_16px,var(--bg)_16px)]";
  return (
    <span className="absolute -top-px -right-px flex rounded-bl-card border-b border-l border-border bg-bg pb-2 pl-2">
      <span aria-hidden className={`${corner} top-0 right-full`} />
      {children}
      <span aria-hidden className={`${corner} top-full right-0`} />
    </span>
  );
}
