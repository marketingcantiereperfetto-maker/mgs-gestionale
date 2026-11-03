"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Badge, FieldError, Notice, fieldClass, focusRing, primaryButton } from "@/components/ui";
import { formatIban } from "@/domain/company/identifiers";
import { companyPath } from "@/lib/company-paths";
import {
  addBankAccount,
  setBankAccountActive,
  setDefaultBankAccount,
  type AccountActionState,
  type BankAccountFormState,
} from "@/server/companies/actions";
import type { BankAccount } from "@/server/companies/queries";

const linkButton = `rounded text-[13px] font-medium text-action ${focusRing}`;

function AccountRow({ companyId, account }: { companyId: string; account: BankAccount }) {
  const [defaultState, makeDefault] = useActionState<AccountActionState, FormData>(
    setDefaultBankAccount,
    { error: null },
  );
  const [activeState, toggleActive] = useActionState<AccountActionState, FormData>(
    setBankAccountActive,
    { error: null },
  );
  const error = defaultState.error ?? activeState.error;

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
          <form action={makeDefault}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="accountId" value={account.id} />
            <button type="submit" className={linkButton}>
              Rendi predefinito
            </button>
          </form>
        ) : null}
        <form action={toggleActive}>
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="accountId" value={account.id} />
          <input type="hidden" name="active" value={String(!account.isActive)} />
          <button type="submit" className={linkButton}>
            {account.isActive ? "Disattiva" : "Riattiva"}
          </button>
        </form>
      </div>
      {error ? (
        <div className="mt-2">
          <Notice tone="warning">{error}</Notice>
        </div>
      ) : null}
    </li>
  );
}

const initialState: BankAccountFormState = { error: null, fieldErrors: {} };

function NewAccountForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(addBankAccount, initialState);
  return (
    // La chiave cambia dopo ogni salvataggio: il modulo si svuota.
    <form key={state.saved ?? 0} action={formAction} className="mt-4 space-y-3">
      {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
      <input type="hidden" name="companyId" value={companyId} />
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
      <button type="submit" disabled={pending} className={primaryButton}>
        Aggiungi conto
      </button>
    </form>
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
            <AccountRow key={account.id} companyId={companyId} account={account} />
          ))}
        </ul>
      )}
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
