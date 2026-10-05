"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";

import { loginAction, resendVerificationAction } from "../actions";
import { loginSchema, type LoginInput } from "../schemas";
import { FormAlert } from "./form-alert";
import { TextField } from "./text-field";

export function LoginForm({ next }: { next?: string }) {
  const [serverError, setServerError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setNotice(null);
    const result = await loginAction(values);
    if (result && !result.ok)
      setServerError({ message: result.error, code: result.code });
  }

  async function resend() {
    const result = await resendVerificationAction({
      email: form.getValues("email"),
    });
    setServerError(null);
    setNotice(result.ok ? (result.message ?? null) : result.error);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError ? (
        <FormAlert tone="error">
          {serverError.message}
          {serverError.code === "EMAIL_NOT_VERIFIED" ? (
            <button
              type="button"
              onClick={resend}
              className="mt-1 block cursor-pointer font-medium underline"
            >
              Send a new link
            </button>
          ) : null}
        </FormAlert>
      ) : null}
      {notice ? <FormAlert tone="success">{notice}</FormAlert> : null}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        labelAside={
          <Link
            href="/reset-password"
            className="text-small text-accent hover:underline"
          >
            Forgot password?
          </Link>
        }
        {...form.register("password")}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
