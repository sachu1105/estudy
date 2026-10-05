import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { resendVerificationAction } from "@/features/auth/actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import { EmailRequestForm } from "@/features/auth/components/email-request-form";
import { VerifyEmailButton } from "@/features/auth/components/verify-email-button";

export const metadata: Metadata = { title: "Verify email" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const params = await searchParams;
  const token = first(params.token);
  const email = first(params.email);

  if (token) {
    return (
      <AuthCard
        title="Verify your email"
        description="One click and your account is ready."
      >
        <VerifyEmailButton token={token} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Check your inbox"
      description={
        email ? (
          <>
            We sent a verification link to{" "}
            <span className="font-medium break-all text-ink">{email}</span>.
          </>
        ) : (
          "We sent you a verification link."
        )
      }
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
            <MailCheck className="size-5" aria-hidden />
          </span>
          <p className="text-small text-ink-muted">
            Open the email and tap the link. It works for 24 hours. Can&apos;t
            find it? Check spam, or send a new one.
          </p>
        </div>
        <EmailRequestForm
          action={resendVerificationAction}
          submitLabel="Send a new link"
          pendingLabel="Sending…"
          defaultEmail={email}
          variant="secondary"
        />
      </div>
    </AuthCard>
  );
}
