"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, FieldError, fieldClass, primaryButton, textButton } from "@/components/ui";
import { formatIban } from "@/domain/company/identifiers";
import { companyPath } from "@/lib/company-paths";
import {
  addBankAccount,
  setBankAccountActive,
  setDefaultBankAccount,
  type ActionState,
  type BankAccountFormState,
} from "@/server/companies/actions";
import type { BankAccount } from "@/server/companies/queries";

const linkButton = textButton;

type RowActions = {
  makeDefault: (formData: FormData) => void;
  toggleActive: (formData: FormData) => void;
};

function AccountRow({
  companyId,
  account,
  actions,
}: {
  companyId: string;
  account: BankAccount;
  actions: RowActions;
}) {
  return (
    <li className="py-2.5" data-testid="bank-account">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono">{formatIban(account.iban)}</span>
        {account.label ? <span className="text-ink-muted">{account.label}</span> : null}
        {account.isDefault ? <Badge tone="success">Predefinito</Badge> : null}
        {!account.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
      </div>
      <div className="mt-1 flex gap-4">
        {account.isActive && !account.isDefault ? (
          <ActionForm action={actions.makeDefault}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="accountId" value={account.id} />
            <SubmitButton pendingLabel="Aggiornamento…" className={linkButton}>
              Rendi predefinito
            </SubmitButton>
          </ActionForm>
        ) : null}
        <ActionForm action={actions.toggleActive}>
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="accountId" value={account.id} />
          <input type="hidden" name="active" value={String(!account.isActive)} />
          <SubmitButton
            pendingLabel={account.isActive ? "Disattivazione…" : "Riattivazione…"}
            className={linkButton}
          >
            {account.isActive ? "Disattiva" : "Riattiva"}
          </SubmitButton>
        </ActionForm>
      </div>
    </li>
  );
}

const initialState: BankAccountFormState = { error: null, fieldErrors: {} };

function NewAccountFields({
  companyId,
  state,
}: {
  companyId: string;
  state: BankAccountFormState;
}) {
  return (
    <>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="creationKey" defaultValue="" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] text-ink-muted">
          IBAN
          <input
            name="iban"
            required
            defaultValue={state.values?.iban}
            aria-invalid={Boolean(state.fieldErrors.iban)}
            aria-describedby="iban-error"
            className={`${fieldClass} font-mono text-[14px] uppercase`}
          />
          <FieldError id="iban-error" message={state.fieldErrors.iban} />
        </label>
        <label className="block text-[13px] text-ink-muted">
          Descrizione (facoltativa, per esempio la banca)
          <input
            name="label"
            defaultValue={state.values?.label}
            className={`${fieldClass} text-[14px]`}
          />
        </label>
      </div>
    </>
  );
}

function NewAccountForm({ companyId }: { companyId: string }) {
  const [state, formAction] = useActionState(addBankAccount, initialState);
  return (
    <ActionForm action={formAction} className="mt-4 space-y-3">
      {/* La chiave cambia dopo ogni conto aggiunto: campi vuoti e nuova chiave di creazione. */}
      <NewAccountFields key={state.done ?? 0} companyId={companyId} state={state} />
      <SubmitButton pendingLabel="Aggiunta…" className={primaryButton}>
        Aggiungi conto
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}

export function BankAccounts({
  companyId,
  accounts,
  showInactive,
}: {
  companyId: string;
  accounts: BankAccount[];
  showInactive: boolean;
}) {
  const [defaultState, makeDefault] = useActionState<ActionState, FormData>(setDefaultBankAccount, {
    error: null,
  });
  const [activeState, toggleActive] = useActionState<ActionState, FormData>(setBankAccountActive, {
    error: null,
  });
  const visible = accounts.filter((account) => showInactive || account.isActive);
  const inactiveCount = accounts.length - accounts.filter((account) => account.isActive).length;
  const path = companyPath(companyId);

  return (
    <>
      {visible.length === 0 ? (
        <p>Nessun conto bancario. Il primo conto inserito diventa quello predefinito per il PDF.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {visible.map((account) => (
            <AccountRow
              key={account.id}
              companyId={companyId}
              account={account}
              actions={{ makeDefault, toggleActive }}
            />
          ))}
        </ul>
      )}
      <ActionFeedback state={defaultState} />
      <ActionFeedback state={activeState} />
      {inactiveCount > 0 ? (
        <Link
          href={showInactive ? path : `${path}?conti=tutti`}
          className={`${linkButton} mt-2 inline-block`}
        >
          {showInactive ? "Nascondi i disattivati" : `Mostra i disattivati (${inactiveCount})`}
        </Link>
      ) : null}
      <NewAccountForm companyId={companyId} />
    </>
  );
}
