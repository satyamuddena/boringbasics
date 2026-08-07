"use client";

import { useActionState } from "react";
import { Field, Input, SubmitButton } from "@/components/admin/ui";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email">
        <Input type="email" name="email" required autoComplete="username" />
      </Field>
      <Field label="Password">
        <Input type="password" name="password" required autoComplete="current-password" />
      </Field>
      {state?.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
