"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { FieldError, fieldClass, primaryButton } from "@/components/ui";
import { createCompany, type CompanyFormState } from "@/server/companies/actions";

const initialState: CompanyFormState = { error: null, fieldErrors: {} };

export function NewCompanyForm() {
  const [state, formAction] = useActionState(createCompany, initialState);
  return (
    <ActionForm action={formAction} className="space-y-4">
      <input type="hidden" name="creationKey" defaultValue="" />
      <label className="block text-[13px] text-ink-muted">
        Ragione sociale
        <input
          name="legalName"
          required
          autoComplete="organization"
          defaultValue={state.values?.legalName}
          aria-invalid={Boolean(state.fieldErrors.legalName)}
          aria-describedby="legalName-error"
          className={`${fieldClass} text-[14px]`}
        />
        <FieldError id="legalName-error" message={state.fieldErrors.legalName} />
      </label>
      <SubmitButton pendingLabel="Creazione…" className={primaryButton}>
        Crea società
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
