"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";

import { registerAction } from "../actions";
import { registerSchema, type RegisterInput } from "../schemas";
import { FormAlert } from "./form-alert";
import { TextField } from "./text-field";

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function RegisterForm() {
  const [serverError, setServerError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction({
      ...values,
      timezone: browserTimezone(),
    });
    if (result && !result.ok)
      setServerError({ message: result.error, code: result.code });
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
          {serverError.code === "EMAIL_TAKEN" ? (
            <Link href="/login" className="mt-1 block font-medium underline">
              Go to log in
            </Link>
          ) : null}
        </FormAlert>
      ) : null}

      <TextField
        label="Your name"
        autoComplete="name"
        error={errors.name?.message}
        {...form.register("name")}
      />
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
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...form.register("password")}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-small text-ink-subtle">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="underline hover:text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
