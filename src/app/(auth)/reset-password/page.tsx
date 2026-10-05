import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import { EmailRequestForm } from "@/features/auth/components/email-request-form";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const token = first((await searchParams).token);
  const footer = (
    <Link href="/login" className="font-medium text-accent hover:underline">
      Back to log in
    </Link>
  );

  if (token) {
    return (
      <AuthCard
        title="Choose a new password"
        description="This signs you out on every other device."
        footer={footer}
      >
        <ResetPasswordForm token={token} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email and we'll send you a reset link."
      footer={footer}
    >
      <EmailRequestForm
        action={requestPasswordResetAction}
        submitLabel="Send reset link"
        pendingLabel="Sending…"
      />
    </AuthCard>
  );
}
