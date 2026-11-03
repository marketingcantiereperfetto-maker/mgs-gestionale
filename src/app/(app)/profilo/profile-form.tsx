"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { FieldError, fieldClass, primaryButton } from "@/components/ui";
import { maxNameLength } from "@/domain/profile/name";
import { updateOwnName, type ProfileFormState } from "@/server/profile/actions";

export function ProfileForm({ fullName }: { fullName: string | null }) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(updateOwnName, {
    error: null,
  });
  return (
    <ActionForm action={formAction} className="space-y-4">
      <label className="block text-[13px] text-ink-muted">
        Nome e cognome (facoltativo: senza nome compare la tua email)
        <input
          name="fullName"
          autoComplete="name"
          maxLength={maxNameLength + 20}
          // Dopo il salvataggio il campo riparte dal nome salvato, che arriva aggiornato dal server.
          defaultValue={state.value ?? fullName ?? ""}
          aria-invalid={Boolean(state.fieldError)}
          aria-describedby="fullName-error"
          className={`${fieldClass} text-[14px]`}
        />
        <FieldError id="fullName-error" message={state.fieldError} />
      </label>
      <SubmitButton pendingLabel="Salvataggio…" className={primaryButton}>
        Salva
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
