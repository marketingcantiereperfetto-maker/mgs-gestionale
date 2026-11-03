"use client";

import { useActionState } from "react";
import { FieldError, Notice, fieldClass, primaryButton } from "@/components/ui";
import { createCompany, type CompanyFormState } from "@/server/companies/actions";

const initialState: CompanyFormState = { error: null, fieldErrors: {} };

export function NewCompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
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
      <button type="submit" disabled={pending} className={primaryButton}>
        Crea società
      </button>
    </form>
  );
}
