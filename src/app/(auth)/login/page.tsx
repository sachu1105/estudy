import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { FormAlert } from "@/features/auth/components/form-alert";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = first(params.next);
  const verified = first(params.verified) === "1";
  const reset = first(params.reset) === "1";

  return (
    <AuthCard
      title="Log in"
      description="Welcome back. Pick up your plan where you left it."
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {verified ? (
          <FormAlert tone="success">
            Email verified. Log in to start your plan.
          </FormAlert>
        ) : null}
        {reset ? (
          <FormAlert tone="success">
            Password changed. Log in with your new password.
          </FormAlert>
        ) : null}
        <LoginForm next={next} />
      </div>
    </AuthCard>
  );
}
