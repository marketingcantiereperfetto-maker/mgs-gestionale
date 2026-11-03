"use client";

import { useActionState } from "react";
import { buttonClass, FormError, inputClass } from "@/components/auth-card";
import { minPasswordLength } from "@/lib/auth/password";
import { setPassword, type FormState } from "@/server/auth/actions";

const initialState: FormState = { error: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium">
        Nuova password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Ripeti la password
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={minPasswordLength}
          required
          className={inputClass}
        />
      </label>
      <p className="text-sm text-ink-muted">Almeno {minPasswordLength} caratteri.</p>
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Salvataggio…" : "Salva la password"}
      </button>
    </form>
  );
}
