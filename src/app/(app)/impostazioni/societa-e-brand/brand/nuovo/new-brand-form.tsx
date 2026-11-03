"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { FieldError, fieldClass, primaryButton } from "@/components/ui";
import { createBrand, type BrandFormState } from "@/server/brands/actions";

const initialState: BrandFormState = { error: null, fieldErrors: {} };

export function NewBrandForm() {
  const [state, formAction] = useActionState(createBrand, initialState);
  return (
    <ActionForm action={formAction} className="space-y-4">
      <input type="hidden" name="creationKey" defaultValue="" />
      <label className="block text-[13px] text-ink-muted">
        Nome del brand
        <input
          name="name"
          required
          defaultValue={state.values?.name}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby="name-error"
          className={`${fieldClass} text-[14px]`}
        />
        <FieldError id="name-error" message={state.fieldErrors.name} />
      </label>
      <SubmitButton pendingLabel="Creazione…" className={primaryButton}>
        Crea brand
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
