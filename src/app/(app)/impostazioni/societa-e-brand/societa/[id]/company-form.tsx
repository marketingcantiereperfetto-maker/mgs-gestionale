"use client";

import { useActionState, useState } from "react";
import { FieldError, Notice, fieldClass, primaryButton, secondaryButton } from "@/components/ui";
import { countryName, type CompanyField } from "@/domain/company/company";
import { updateCompany, type CompanyFormState } from "@/server/companies/actions";
import type { Company } from "@/server/companies/queries";

const initialState: CompanyFormState = { error: null, fieldErrors: {} };

const labels: Record<CompanyField, string> = {
  legalName: "Ragione sociale",
  vatNumber: "Partita IVA",
  taxCode: "Codice fiscale",
  email: "Email",
  addressStreet: "Via e numero civico",
  addressPostalCode: "CAP",
  addressCity: "Comune",
  addressProvince: "Provincia",
  addressCountry: "Paese (codice a due lettere)",
};

function Field({
  name,
  value,
  error,
  type = "text",
  required,
}: {
  name: CompanyField;
  value: string | null;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-[13px] text-ink-muted">
      {labels[name]}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={`${name}-error`}
        className={`${fieldClass} text-[14px]`}
      />
      <FieldError id={`${name}-error`} message={error} />
    </label>
  );
}

export function CompanyForm({ company }: { company: Company }) {
  const [state, formAction, pending] = useActionState(updateCompany, initialState);
  // Il paese parte vuoto: «Italia» si sceglie con un clic e si salva con «Salva».
  const [country, setCountry] = useState(company.addressCountry ?? "");
  const errors = state.fieldErrors;
  const value = (name: CompanyField) => state.values?.[name] ?? company[name];
  const countryLabel = countryName(country.trim().toUpperCase());

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
      <input type="hidden" name="id" value={company.id} />
      <Field name="legalName" value={value("legalName")} error={errors.legalName} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="vatNumber" value={value("vatNumber")} error={errors.vatNumber} />
        <Field name="taxCode" value={value("taxCode")} error={errors.taxCode} />
      </div>
      <Field name="email" type="email" value={value("email")} error={errors.email} />

      <fieldset className="space-y-4">
        <legend className="text-[13px] font-semibold text-ink">Sede legale</legend>
        <Field name="addressStreet" value={value("addressStreet")} error={errors.addressStreet} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="addressPostalCode"
            value={value("addressPostalCode")}
            error={errors.addressPostalCode}
          />
          <Field name="addressCity" value={value("addressCity")} error={errors.addressCity} />
          <Field
            name="addressProvince"
            value={value("addressProvince")}
            error={errors.addressProvince}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-[13px] text-ink-muted">
            {labels.addressCountry}
            <input
              name="addressCountry"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              maxLength={2}
              aria-invalid={Boolean(errors.addressCountry)}
              aria-describedby="addressCountry-error addressCountry-name"
              className={`${fieldClass.replace("w-full", "w-24")} text-[14px] uppercase`}
            />
          </label>
          <button type="button" onClick={() => setCountry("IT")} className={secondaryButton}>
            Italia
          </button>
          <span id="addressCountry-name" className="pb-1.5 text-ink-muted" aria-live="polite">
            {countryLabel ?? ""}
          </span>
        </div>
        <FieldError id="addressCountry-error" message={errors.addressCountry} />
      </fieldset>

      <button type="submit" disabled={pending} className={primaryButton}>
        Salva
      </button>
    </form>
  );
}
