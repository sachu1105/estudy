import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1>Reset password</h1>
      <p className="text-ink-muted">Choose a new password for your account.</p>
      <p className="text-small text-ink-subtle">
        This form is built in milestone 2.
      </p>
    </div>
  );
}
