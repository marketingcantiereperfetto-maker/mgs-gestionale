"use client";

import { useState } from "react";
import { FieldError, fieldClass, secondaryButton } from "@/components/ui";
import { countryName } from "@/domain/company/company";
import {
  subjectTypeLabels,
  subjectTypes,
  vatRegimeLabels,
  vatRegimes,
  type CustomerField,
} from "@/domain/customers/customer";
import type { CustomerFormState } from "@/server/customers/actions";

// Campi del cliente, uguali nella scheda e nella maschera «Aggiungi cliente» (cap. 16.2).

export type Errors = CustomerFormState["fieldErrors"];

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

export function Text({
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

export function Choice({
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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-[13px] font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

type Value = (name: CustomerField) => string;

function IdentityAndTaxFields({ value, errors }: { value: Value; errors: Errors }) {
  return (
    <>
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
      </Section>
    </>
  );
}

function OtherFields({
  value,
  errors,
  recipient,
  officeCodeShownAbove,
}: {
  value: Value;
  errors: Errors;
  recipient?: string | null;
  officeCodeShownAbove: boolean;
}) {
  return (
    <>
      <Text name="foreignTaxId" value={value("foreignTaxId")} errors={errors} />
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
        {recipient !== undefined ? (
          <p className="text-[13px] text-ink-muted" data-testid="recipient-code">
            {recipient
              ? `Codice destinatario che si userà in fattura: ${recipient}.`
              : "Codice destinatario non ancora disponibile."}{" "}
            Privato: 0000000; estero: XXXXXXX; con la sola PEC: 0000000.
          </p>
        ) : null}
      </Section>

      <Section title="Pubblica Amministrazione">
        <div className="grid gap-4 sm:grid-cols-2">
          {officeCodeShownAbove ? null : (
            <Text name="paOfficeCode" value={value("paOfficeCode")} errors={errors} />
          )}
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
          options={vatRegimes.map((regime) => ({ value: regime, label: vatRegimeLabels[regime] }))}
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
    </>
  );
}

// Scheda: tutti i campi visibili.
export function CustomerFields({
  value,
  errors,
  recipient,
}: {
  value: Value;
  errors: Errors;
  recipient: string | null;
}) {
  return (
    <>
      <IdentityAndTaxFields value={value} errors={errors} />
      <OtherFields
        value={value}
        errors={errors}
        recipient={recipient}
        officeCodeShownAbove={false}
      />
    </>
  );
}

// Maschera: nome, tipo, partita IVA, codice fiscale e codice ufficio PA (servono al controllo
// dei doppioni); il resto in «Altri dati (facoltativi)».
export function QuickCustomerFields({ value, errors }: { value: Value; errors: Errors }) {
  const othersHaveErrors = Object.keys(errors).some(
    (name) => !["name", "subjectType", "vatNumber", "taxCode", "paOfficeCode"].includes(name),
  );
  return (
    <>
      <IdentityAndTaxFields value={value} errors={errors} />
      <Text name="paOfficeCode" value={value("paOfficeCode")} errors={errors} />
      <details className="rounded-[10px] border border-line/70 p-3" open={othersHaveErrors}>
        <summary className="cursor-pointer text-[14px] font-medium text-ink">
          Altri dati (facoltativi)
        </summary>
        <div className="mt-4 space-y-6">
          <OtherFields value={value} errors={errors} officeCodeShownAbove />
        </div>
      </details>
    </>
  );
}

// Casella per confermare che il cliente è diverso da quello con la stessa partita IVA o lo
// stesso codice fiscale.
export function ConfirmDifferent({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <input type="checkbox" name="confirmDifferent" className="size-4 accent-action" />È un cliente
      diverso
    </label>
  );
}
