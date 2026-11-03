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

// Caselle delle società. Sono non controllate e ricreate (key) a ogni cambio dei collegamenti
// salvati: dopo il salvataggio mostrano sempre lo stato vero, anche quando il modulo con
// azione riporta i campi ai valori di partenza.
function CompanyCheckboxes({
  companies,
  linkedIds,
}: {
  companies: CompanyOption[];
  linkedIds: string[];
}) {
  const [checkedCount, setCheckedCount] = useState(linkedIds.length);
  return (
    <>
      <fieldset
        className="space-y-2"
        onChange={(event) => {
          const fieldset = event.currentTarget;
          setCheckedCount(fieldset.querySelectorAll("input:checked").length);
        }}
      >
        <legend className="sr-only">Società che usano questo brand</legend>
        {companies.map((company) => (
          <label key={company.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="companyIds"
              value={company.id}
              defaultChecked={linkedIds.includes(company.id)}
              className="size-4 accent-action"
            />
            {company.name}
            {!company.isActive ? <Badge tone="warning">Disattivata</Badge> : null}
          </label>
        ))}
      </fieldset>
      {/* Avviso, non blocco: un brand può restare senza società. */}
      {checkedCount === 0 && linkedIds.length > 0 ? (
        <Notice tone="info">Salvando, il brand resterà senza società.</Notice>
      ) : null}
    </>
  );
}

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

  if (companies.length === 0) {
    return <p>Nessuna società attiva da collegare. Aggiungi prima una società.</p>;
  }

  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="brandId" value={brandId} />
      <CompanyCheckboxes
        key={[...linkedIds].sort().join(",")}
        companies={companies}
        linkedIds={linkedIds}
      />
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
