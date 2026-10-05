import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1>Verify email</h1>
      <p className="text-ink-muted">
        Check your inbox for a verification link.
      </p>
      <p className="text-small text-ink-subtle">
        This form is built in milestone 2.
      </p>
    </div>
  );
}
