"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { FieldError, fieldClass, primaryButton } from "@/components/ui";
import { subjectTypeLabels, subjectTypes } from "@/domain/customers/customer";
import { createCustomer, type CustomerFormState } from "@/server/customers/actions";

const initialState: CustomerFormState = { error: null, fieldErrors: {} };

// Inserimento essenziale: nome e, se si vuole, tipo di soggetto. Il resto si completa nella
// scheda.
export function NewCustomerForm() {
  const [state, formAction] = useActionState(createCustomer, initialState);
  return (
    <ActionForm action={formAction} className="space-y-4">
      <input type="hidden" name="creationKey" defaultValue="" />
      <label className="block text-[13px] text-ink-muted">
        Nome o ragione sociale
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
      <div className="text-[13px] text-ink-muted">
        <label htmlFor="subjectType">Tipo di soggetto (facoltativo)</label>
        <select
          key={state.values?.subjectType ?? ""}
          id="subjectType"
          name="subjectType"
          defaultValue={state.values?.subjectType ?? ""}
          className={`${fieldClass} text-[14px]`}
        >
          <option value="">Non indicato</option>
          {subjectTypes.map((type) => (
            <option key={type} value={type}>
              {subjectTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton pendingLabel="Creazione…" className={primaryButton}>
        Crea cliente
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
