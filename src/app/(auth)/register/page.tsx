import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1>Create account</h1>
      <p className="text-ink-muted">
        Create an account to build your study plan.
      </p>
      <p className="text-small text-ink-subtle">
        This form is built in milestone 2.
      </p>
    </div>
  );
}
