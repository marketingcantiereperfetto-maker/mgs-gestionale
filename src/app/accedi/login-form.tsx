"use client";

import { useActionState } from "react";
import { buttonClass, FormError, inputClass } from "@/components/auth-card";
import { signIn, type FormState } from "@/server/auth/actions";

const initialState: FormState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
