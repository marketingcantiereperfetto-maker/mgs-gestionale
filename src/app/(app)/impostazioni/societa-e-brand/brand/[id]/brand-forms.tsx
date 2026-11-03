"use client";

import { useActionState, useState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import {
  Badge,
  FieldError,
  Notice,
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/components/ui";
import {
  renameBrand,
  setBrandActive,
  setBrandCompanies,
  type BrandActionState,
  type BrandFormState,
} from "@/server/brands/actions";

export function BrandNameForm({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState<BrandFormState, FormData>(renameBrand, {
    error: null,
    fieldErrors: {},
  });
  return (
    <ActionForm action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <label className="block text-[13px] text-ink-muted">
        Nome del brand
        <input
          name="name"
          required
          defaultValue={state.values?.name ?? name}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby="name-error"
          className={`${fieldClass} text-[14px]`}
        />
        <FieldError id="name-error" message={state.fieldErrors.name} />
      </label>
      <SubmitButton pendingLabel="Salvataggio…" className={primaryButton}>
        Salva
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}

type CompanyOption = { id: string; name: string; isActive: boolean };

export function BrandCompaniesForm({
  brandId,
  companies,
  linkedIds,
}: {
  brandId: string;
  companies: CompanyOption[];
  linkedIds: string[];
}) {
  const [state, formAction] = useActionState<BrandActionState, FormData>(setBrandCompanies, {
    error: null,
  });
  const [checked, setChecked] = useState(() => new Set(linkedIds));

  if (companies.length === 0) {
    return <p>Nessuna società attiva da collegare. Aggiungi prima una società.</p>;
  }

  function toggle(id: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="brandId" value={brandId} />
      <fieldset className="space-y-2">
        <legend className="sr-only">Società che usano questo brand</legend>
        {companies.map((company) => (
          <label key={company.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="companyIds"
              value={company.id}
              checked={checked.has(company.id)}
              onChange={(event) => toggle(company.id, event.target.checked)}
              className="size-4 accent-action"
            />
            {company.name}
            {!company.isActive ? <Badge tone="warning">Disattivata</Badge> : null}
          </label>
        ))}
      </fieldset>
      {/* Avviso, non blocco: un brand può restare senza società. */}
      {checked.size === 0 && linkedIds.length > 0 ? (
        <Notice tone="info">Salvando, il brand resterà senza società.</Notice>
      ) : null}
      <SubmitButton pendingLabel="Salvataggio…" className={primaryButton}>
        Salva collegamenti
      </SubmitButton>
      <ActionFeedback state={state} />
      {state.warning ? <Notice tone="info">{state.warning}</Notice> : null}
    </ActionForm>
  );
}

export function BrandActiveForm({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction] = useActionState(setBrandActive, { error: null });
  return (
    <ActionForm action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <SubmitButton
        pendingLabel={isActive ? "Disattivazione…" : "Riattivazione…"}
        className={secondaryButton}
      >
        {isActive ? "Disattiva" : "Riattiva"}
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
