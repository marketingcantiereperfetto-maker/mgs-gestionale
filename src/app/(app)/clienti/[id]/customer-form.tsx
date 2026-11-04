"use client";

import { useActionState, useState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { FieldError, fieldClass, primaryButton, secondaryButton } from "@/components/ui";
import { countryName } from "@/domain/company/company";
import {
  effectiveRecipientCode,
  subjectTypeLabels,
  subjectTypes,
  vatRegimeLabels,
  vatRegimes,
  type CustomerField,
} from "@/domain/customers/customer";
import { updateCustomer, type CustomerFormState } from "@/server/customers/actions";
import type { Customer } from "@/server/customers/queries";

type CompanyOption = { id: string; name: string; isActive: boolean };
type Errors = CustomerFormState["fieldErrors"];

const labels: Record<CustomerField, string> = {
  name: "Nome o ragione sociale",
  subjectType: "Tipo di soggetto",
  vatNumber: "Partita IVA",
  taxCode: "Codice fiscale",
  foreignTaxId: "Identificativo fiscale estero",
  addressStreet: "Via e numero civico",
  addressPostalCode: "CAP",
  addressCity: "Comune",
  addressProvince: "Provincia",
  addressCountry: "Nazione (codice a due lettere)",
  sdiCode: "Codice destinatario (7 caratteri)",
  pec: "PEC",
  paOfficeCode: "Codice univoco ufficio (6 caratteri)",
  paOfficeName: "Nome dell'ufficio",
  splitPayment: "Split payment",
  vatRegime: "Regime IVA",
  vatExemptionNature: "Natura dell'esenzione",
  intentDeclarationNumber: "Numero della dichiarazione d'intento",
  intentDeclarationDate: "Data della dichiarazione d'intento",
};

function Text({
  name,
  value,
  errors,
  type = "text",
  required,
}: {
  name: CustomerField;
  value: string | null | undefined;
  errors: Errors;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-[13px] text-ink-muted">
      {labels[name]}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={value ?? ""}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={`${name}-error`}
        className={`${fieldClass} text-[14px]`}
      />
      <FieldError id={`${name}-error`} message={errors[name]} />
    </label>
  );
}

function Choice({
  name,
  value,
  options,
  emptyLabel,
  errors,
}: {
  name: CustomerField | "groupCompanyId";
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string;
  errors: Errors;
}) {
  const label = name === "groupCompanyId" ? "Società del gruppo" : labels[name];
  return (
    <div className="text-[13px] text-ink-muted">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={`${name}-error`}
        className={`${fieldClass} text-[14px]`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );
}

// La nazione parte vuota: «Italia» si sceglie con un clic e si salva con «Salva».
function CountryField({ initial, errors }: { initial: string; errors: Errors }) {
  const [country, setCountry] = useState(initial);
  return (
    <div>
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
          {countryName(country.trim().toUpperCase()) ?? ""}
        </span>
      </div>
      <FieldError id="addressCountry-error" message={errors.addressCountry} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-[13px] font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function CustomerForm({
  customer,
  companies,
  canEditGroup,
}: {
  customer: Customer;
  companies: CompanyOption[];
  canEditGroup: boolean;
}) {
  const [state, formAction] = useActionState(updateCustomer, { error: null, fieldErrors: {} });
  const errors = state.fieldErrors;
  // Dopo un errore si mostrano i valori scritti; dopo un salvataggio quelli salvati.
  const value = (name: CustomerField): string => {
    const written = state.values?.[name];
    if (written !== undefined) return written;
    const saved = customer[name];
    if (typeof saved === "boolean") return saved ? "si" : "no";
    return saved ?? "";
  };
  const group = state.values?.groupCompanyId ?? customer.groupCompanyId ?? "";
  const groupName = companies.find((company) => company.id === customer.groupCompanyId)?.name;
  const recipient = effectiveRecipientCode(customer);

  return (
    <ActionForm action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={customer.id} />
      {/* Ricreati dopo ogni invio: dopo un salvataggio mostrano i dati salvati, dopo un errore
          quelli scritti (anche i menu a tendina, che il modulo altrimenti riporterebbe a vuoto). */}
      <div key={`${state.done ?? 0}:${JSON.stringify(state.values ?? {})}`} className="space-y-6">
        <Section title="Identità">
          <Text name="name" value={value("name")} errors={errors} required />
          <Choice
            name="subjectType"
            value={value("subjectType")}
            options={subjectTypes.map((type) => ({ value: type, label: subjectTypeLabels[type] }))}
            emptyLabel="Non indicato"
            errors={errors}
          />
        </Section>

        <Section title="Dati fiscali">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="vatNumber" value={value("vatNumber")} errors={errors} />
            <Text name="taxCode" value={value("taxCode")} errors={errors} />
          </div>
          <Text name="foreignTaxId" value={value("foreignTaxId")} errors={errors} />
        </Section>

        <Section title="Sede legale">
          <Text name="addressStreet" value={value("addressStreet")} errors={errors} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="addressPostalCode" value={value("addressPostalCode")} errors={errors} />
            <Text name="addressCity" value={value("addressCity")} errors={errors} />
            <Text name="addressProvince" value={value("addressProvince")} errors={errors} />
          </div>
          <CountryField initial={value("addressCountry")} errors={errors} />
        </Section>

        <Section title="Fattura elettronica">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="sdiCode" value={value("sdiCode")} errors={errors} />
            <Text name="pec" type="email" value={value("pec")} errors={errors} />
          </div>
          <p className="text-[13px] text-ink-muted" data-testid="recipient-code">
            {recipient
              ? `Codice destinatario che si userà in fattura: ${recipient}.`
              : "Codice destinatario non ancora disponibile."}{" "}
            Privato: 0000000; estero: XXXXXXX; con la sola PEC: 0000000.
          </p>
        </Section>

        <Section title="Pubblica Amministrazione">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="paOfficeCode" value={value("paOfficeCode")} errors={errors} />
            <Text name="paOfficeName" value={value("paOfficeName")} errors={errors} />
          </div>
          <Choice
            name="splitPayment"
            value={value("splitPayment")}
            options={[
              { value: "si", label: "Sì" },
              { value: "no", label: "No" },
            ]}
            emptyLabel="Non scelto"
            errors={errors}
          />
        </Section>

        <Section title="Regime IVA">
          <Choice
            name="vatRegime"
            value={value("vatRegime")}
            options={vatRegimes.map((regime) => ({
              value: regime,
              label: vatRegimeLabels[regime],
            }))}
            emptyLabel="Non indicato"
            errors={errors}
          />
          <Text name="vatExemptionNature" value={value("vatExemptionNature")} errors={errors} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              name="intentDeclarationNumber"
              value={value("intentDeclarationNumber")}
              errors={errors}
            />
            <Text
              name="intentDeclarationDate"
              type="date"
              value={value("intentDeclarationDate")}
              errors={errors}
            />
          </div>
        </Section>

        <Section title="Società del gruppo">
          {canEditGroup && companies.length === 0 ? (
            <p className="text-[14px]">
              Nessuna società da indicare: compaiono le società del gruppo che puoi vedere (il
              titolare le vede tutte, gli altri ruoli quelle a cui sono collegati).
            </p>
          ) : canEditGroup ? (
            <Choice
              name="groupCompanyId"
              value={group}
              options={companies
                .filter((company) => company.isActive || company.id === customer.groupCompanyId)
                .map((company) => ({ value: company.id, label: company.name }))}
              emptyLabel="Non è una società del gruppo"
              errors={errors}
            />
          ) : (
            <p className="text-[14px]">
              {customer.groupCompanyId
                ? groupName
                  ? `Società del gruppo: ${groupName}.`
                  : "È una società del gruppo."
                : "Non è una società del gruppo."}{" "}
              <span className="text-ink-muted">
                La indicano titolare e amministrazione economica.
              </span>
            </p>
          )}
        </Section>
      </div>

      <SubmitButton pendingLabel="Salvataggio…" className={primaryButton}>
        Salva
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
