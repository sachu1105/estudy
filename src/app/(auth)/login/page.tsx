import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1>Log in</h1>
      <p className="text-ink-muted">
        Welcome back. Log in to continue your plan.
      </p>
      <p className="text-small text-ink-subtle">
        This form is built in milestone 2.
      </p>
    </div>
  );
}
