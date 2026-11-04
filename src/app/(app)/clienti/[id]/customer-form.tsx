"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import {
  Choice,
  ConfirmDifferent,
  CustomerFields,
  Section,
} from "@/components/customers/customer-fields";
import { primaryButton } from "@/components/ui";
import { effectiveRecipientCode, type CustomerField } from "@/domain/customers/customer";
import { updateCustomer } from "@/server/customers/actions";
import type { Customer } from "@/server/customers/queries";

type CompanyOption = { id: string; name: string; isActive: boolean };

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
        <CustomerFields value={value} errors={errors} recipient={recipient} />

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

      <ConfirmDifferent show={Boolean(state.needsConfirmation)} />
      <SubmitButton pendingLabel="Salvataggio…" className={primaryButton}>
        Salva
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
