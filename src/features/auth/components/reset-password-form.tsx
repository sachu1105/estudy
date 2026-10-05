"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

import { resetPasswordAction } from "../actions";
import { resetSchema, type ResetInput } from "../schemas";
import { FormAlert } from "./form-alert";
import { TextField } from "./text-field";

export function ResetPasswordForm({ token }: { token: string }) {
  // Disabled until hydrated: an early tap would otherwise do a native GET submit and put
  // the form values (passwords included) in the URL.
  const hydrated = useHydrated();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token, password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResetInput) {
    setServerError(null);
    const result = await resetPasswordAction(values);
    if (result && !result.ok) setServerError(result.error);
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError ? (
        <FormAlert tone="error">
          {serverError}
          <Link
            href="/reset-password"
            className="mt-1 block font-medium underline"
          >
            Request a new link
          </Link>
        </FormAlert>
      ) : null}
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...form.register("password")}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...form.register("confirm")}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-2 w-full"
        disabled={!hydrated || isSubmitting}
      >
        {isSubmitting ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
