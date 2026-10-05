import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1>{title}</h1>
        {description ? <p className="text-ink-muted">{description}</p> : null}
      </div>
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
        {children}
      </div>
      {footer ? (
        <div className="text-center text-small text-ink-muted">{footer}</div>
      ) : null}
    </div>
  );
}
