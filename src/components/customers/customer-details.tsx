"use client";

import { useActionState, useId, useState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import {
  Badge,
  FieldError,
  fieldClass,
  primaryButton,
  secondaryButton,
  textButton,
} from "@/components/ui";
import { countryName } from "@/domain/company/company";
import {
  saveAddress,
  saveContact,
  setAddressActive,
  setContactActive,
  setDefaultAddress,
  setPrimaryContact,
  type AddressFormState,
  type ContactFormState,
} from "@/server/customers/detail-actions";
import type { CustomerAddress, CustomerContact } from "@/server/customers/details";
import type { ActionResult } from "@/components/action-form";

// Referenti e indirizzi di consegna nella scheda del cliente (decisioni del 4 novembre 2026).
// Dopo ogni salvataggio i campi si ricreano dai dati salvati (chiave legata ai dati), mentre il
// modulo resta aperto con la conferma.

type Errors = Record<string, string | undefined>;

function Field({
  prefix,
  name,
  label,
  value,
  errors,
  type = "text",
  required,
  autoComplete = "off",
}: {
  prefix: string;
  name: string;
  label: string;
  value: string | null | undefined;
  errors: Errors;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const errorId = `${prefix}-${name}-error`;
  return (
    <label className="block text-[13px] text-ink-muted">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={value ?? ""}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errorId}
        className={`${fieldClass} text-[14px]`}
      />
      <FieldError id={errorId} message={errors[name]} />
    </label>
  );
}

// Il paese parte vuoto nei nuovi indirizzi: «Italia» si sceglie con un clic e si salva con il modulo.
function CountryField({
  prefix,
  initial,
  errors,
}: {
  prefix: string;
  initial: string;
  errors: Errors;
}) {
  const [country, setCountry] = useState(initial);
  const errorId = `${prefix}-country-error`;
  const nameId = `${prefix}-country-name`;
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-[13px] text-ink-muted">
          Paese (codice a due lettere)
          <input
            name="country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            maxLength={2}
            required
            aria-invalid={Boolean(errors.country)}
            aria-describedby={`${errorId} ${nameId}`}
            className={`${fieldClass.replace("w-full", "w-24")} text-[14px] uppercase`}
          />
        </label>
        <button type="button" onClick={() => setCountry("IT")} className={secondaryButton}>
          Italia
        </button>
        <span id={nameId} className="pb-1.5 text-ink-muted" aria-live="polite">
          {countryName(country.trim().toUpperCase()) ?? ""}
        </span>
      </div>
      <FieldError id={errorId} message={errors.country} />
    </div>
  );
}

function SmallAction({
  action,
  hidden,
  label,
  pendingLabel,
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
  label: string;
  pendingLabel: string;
}) {
  return (
    <ActionForm action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton pendingLabel={pendingLabel} className={textButton}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

// Referenti ------------------------------------------------------------------------------------

function ContactFields({
  prefix,
  values,
  errors,
}: {
  prefix: string;
  values: Partial<Record<"name" | "role" | "email" | "phone", string | null>>;
  errors: Errors;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        prefix={prefix}
        name="name"
        label="Nome"
        value={values.name}
        errors={errors}
        required
      />
      <Field
        prefix={prefix}
        name="role"
        label="Ruolo (facoltativo)"
        value={values.role}
        errors={errors}
      />
      <Field
        prefix={prefix}
        name="email"
        type="email"
        label="Email (facoltativa)"
        value={values.email}
        errors={errors}
      />
      <Field
        prefix={prefix}
        name="phone"
        type="tel"
        label="Telefono (facoltativo)"
        value={values.phone}
        errors={errors}
      />
    </div>
  );
}

const emptyContactState: ContactFormState = { error: null, fieldErrors: {} };

function ContactForm({
  customerId,
  contact,
}: {
  customerId: string;
  contact: CustomerContact | null;
}) {
  const [state, formAction] = useActionState(saveContact, emptyContactState);
  const prefix = useId();
  // Dopo un errore si ricreano con i valori scritti; dopo un salvataggio con quelli salvati.
  const values = state.values ?? contact ?? {};
  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="contactId" value={contact?.id ?? ""} />
      {contact ? null : <input type="hidden" name="creationKey" defaultValue="" />}
      <div
        key={`${JSON.stringify(contact)}-${state.done ?? 0}-${JSON.stringify(state.values ?? {})}`}
      >
        <ContactFields prefix={prefix} values={values} errors={state.fieldErrors} />
      </div>
      <SubmitButton
        pendingLabel={contact ? "Salvataggio…" : "Aggiunta…"}
        className={contact ? secondaryButton : primaryButton}
      >
        {contact ? "Salva referente" : "Aggiungi referente"}
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}

function ContactRow({
  customerId,
  contact,
  canDeactivate,
  actions,
}: {
  customerId: string;
  contact: CustomerContact;
  canDeactivate: boolean;
  actions: { makePrimary: (formData: FormData) => void; toggle: (formData: FormData) => void };
}) {
  const hidden = { customerId, contactId: contact.id };
  return (
    <li className="py-3" data-testid="contact">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{contact.name}</span>
        {contact.role ? <span className="text-ink-muted">· {contact.role}</span> : null}
        {contact.isPrimary ? <Badge tone="success">Principale</Badge> : null}
        {!contact.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
      </div>
      {contact.email || contact.phone ? (
        <p className="mt-1 text-[14px] text-ink-muted">
          {[contact.email, contact.phone].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-4">
        {contact.isActive && !contact.isPrimary ? (
          <SmallAction
            action={actions.makePrimary}
            hidden={hidden}
            label="Rendi principale"
            pendingLabel="Aggiornamento…"
          />
        ) : null}
        {canDeactivate ? (
          <SmallAction
            action={actions.toggle}
            hidden={{ ...hidden, active: String(!contact.isActive) }}
            label={contact.isActive ? "Disattiva" : "Riattiva"}
            pendingLabel={contact.isActive ? "Disattivazione…" : "Riattivazione…"}
          />
        ) : null}
      </div>
      {contact.isActive ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-medium text-action">Modifica</summary>
          <div className="mt-3">
            <ContactForm customerId={customerId} contact={contact} />
          </div>
        </details>
      ) : null}
    </li>
  );
}

function InactiveList({ count, children }: { count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[13px] font-medium text-action">
        Disattivati ({count})
      </summary>
      <ul className="divide-y divide-line/70">{children}</ul>
    </details>
  );
}

export function CustomerContacts({
  customerId,
  contacts,
  canDeactivate,
}: {
  customerId: string;
  contacts: CustomerContact[];
  canDeactivate: boolean;
}) {
  const [primaryState, makePrimary] = useActionState<ActionResult, FormData>(setPrimaryContact, {
    error: null,
  });
  const [activeState, toggle] = useActionState<ActionResult, FormData>(setContactActive, {
    error: null,
  });
  const active = contacts.filter((contact) => contact.isActive);
  const inactive = contacts.filter((contact) => !contact.isActive);
  const row = (contact: CustomerContact) => (
    <ContactRow
      key={contact.id}
      customerId={customerId}
      contact={contact}
      canDeactivate={canDeactivate}
      actions={{ makePrimary, toggle }}
    />
  );
  return (
    <div data-testid="customer-contacts">
      {active.length === 0 ? (
        <p className="text-ink-muted">
          Nessun referente. Il primo referente aggiunto diventa quello principale.
        </p>
      ) : (
        <ul className="divide-y divide-line/70">{active.map(row)}</ul>
      )}
      <InactiveList count={inactive.length}>{inactive.map(row)}</InactiveList>
      <ActionFeedback state={primaryState} />
      <ActionFeedback state={activeState} />
      <details className="mt-4 rounded-[10px] border border-line/70 p-3">
        <summary className="cursor-pointer text-[14px] font-medium text-ink">
          Aggiungi un referente
        </summary>
        <div className="mt-3">
          <ContactForm customerId={customerId} contact={null} />
        </div>
      </details>
    </div>
  );
}

// Indirizzi di consegna -----------------------------------------------------------------------

type AddressValues = Partial<
  Record<"description" | "street" | "postalCode" | "city" | "province" | "country", string | null>
>;

function AddressFields({
  prefix,
  values,
  errors,
}: {
  prefix: string;
  values: AddressValues;
  errors: Errors;
}) {
  return (
    <div className="space-y-4">
      <Field
        prefix={prefix}
        name="description"
        label="Descrizione (facoltativa, per esempio «Magazzino»)"
        value={values.description}
        errors={errors}
      />
      <Field
        prefix={prefix}
        name="street"
        label="Via e numero civico"
        value={values.street}
        errors={errors}
        required
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          prefix={prefix}
          name="postalCode"
          label="CAP"
          value={values.postalCode}
          errors={errors}
        />
        <Field
          prefix={prefix}
          name="city"
          label="Comune"
          value={values.city}
          errors={errors}
          required
        />
        <Field
          prefix={prefix}
          name="province"
          label="Provincia"
          value={values.province}
          errors={errors}
        />
      </div>
      <CountryField prefix={prefix} initial={values.country ?? ""} errors={errors} />
    </div>
  );
}

const emptyAddressState: AddressFormState = { error: null, fieldErrors: {} };

function AddressForm({
  customerId,
  address,
}: {
  customerId: string;
  address: CustomerAddress | null;
}) {
  const [state, formAction] = useActionState(saveAddress, emptyAddressState);
  const prefix = useId();
  const values: AddressValues = state.values ?? address ?? {};
  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="addressId" value={address?.id ?? ""} />
      {address ? null : <input type="hidden" name="creationKey" defaultValue="" />}
      <div
        key={`${JSON.stringify(address)}-${state.done ?? 0}-${JSON.stringify(state.values ?? {})}`}
      >
        <AddressFields prefix={prefix} values={values} errors={state.fieldErrors} />
      </div>
      <SubmitButton
        pendingLabel={address ? "Salvataggio…" : "Aggiunta…"}
        className={address ? secondaryButton : primaryButton}
      >
        {address ? "Salva indirizzo" : "Aggiungi indirizzo"}
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}

function formatAddress(address: CustomerAddress): string {
  const place = [
    address.postalCode,
    address.city,
    address.province ? `(${address.province})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const country = countryName(address.country) ?? address.country;
  return [address.street, place, country].join(", ");
}

function AddressRow({
  customerId,
  address,
  canDeactivate,
  actions,
}: {
  customerId: string;
  address: CustomerAddress;
  canDeactivate: boolean;
  actions: { makeDefault: (formData: FormData) => void; toggle: (formData: FormData) => void };
}) {
  const hidden = { customerId, addressId: address.id };
  return (
    <li className="py-3" data-testid="address">
      <div className="flex flex-wrap items-center gap-2">
        {address.description ? <span className="font-medium">{address.description}</span> : null}
        {address.isDefault ? <Badge tone="success">Predefinito</Badge> : null}
        {!address.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
      </div>
      <p className="mt-1 text-[14px]">{formatAddress(address)}</p>
      <div className="mt-1 flex flex-wrap items-center gap-4">
        {address.isActive && !address.isDefault ? (
          <SmallAction
            action={actions.makeDefault}
            hidden={hidden}
            label="Rendi predefinito"
            pendingLabel="Aggiornamento…"
          />
        ) : null}
        {canDeactivate ? (
          <SmallAction
            action={actions.toggle}
            hidden={{ ...hidden, active: String(!address.isActive) }}
            label={address.isActive ? "Disattiva" : "Riattiva"}
            pendingLabel={address.isActive ? "Disattivazione…" : "Riattivazione…"}
          />
        ) : null}
      </div>
      {address.isActive ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-medium text-action">Modifica</summary>
          <div className="mt-3">
            <AddressForm customerId={customerId} address={address} />
          </div>
        </details>
      ) : null}
    </li>
  );
}

export function CustomerAddresses({
  customerId,
  addresses,
  canDeactivate,
}: {
  customerId: string;
  addresses: CustomerAddress[];
  canDeactivate: boolean;
}) {
  const [defaultState, makeDefault] = useActionState<ActionResult, FormData>(setDefaultAddress, {
    error: null,
  });
  const [activeState, toggle] = useActionState<ActionResult, FormData>(setAddressActive, {
    error: null,
  });
  const active = addresses.filter((address) => address.isActive);
  const inactive = addresses.filter((address) => !address.isActive);
  const row = (address: CustomerAddress) => (
    <AddressRow
      key={address.id}
      customerId={customerId}
      address={address}
      canDeactivate={canDeactivate}
      actions={{ makeDefault, toggle }}
    />
  );
  return (
    <div data-testid="customer-addresses">
      {active.length === 0 ? (
        <p className="text-ink-muted">
          Nessun indirizzo di consegna. Il primo indirizzo aggiunto diventa quello predefinito.
        </p>
      ) : (
        <ul className="divide-y divide-line/70">{active.map(row)}</ul>
      )}
      <InactiveList count={inactive.length}>{inactive.map(row)}</InactiveList>
      <ActionFeedback state={defaultState} />
      <ActionFeedback state={activeState} />
      <details className="mt-4 rounded-[10px] border border-line/70 p-3">
        <summary className="cursor-pointer text-[14px] font-medium text-ink">
          Aggiungi un indirizzo di consegna
        </summary>
        <div className="mt-3">
          <AddressForm customerId={customerId} address={null} />
        </div>
      </details>
    </div>
  );
}
