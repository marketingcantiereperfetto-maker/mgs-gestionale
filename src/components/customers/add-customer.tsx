"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmDifferent, QuickCustomerFields } from "@/components/customers/customer-fields";
import { Badge, primaryButton, secondaryButton, textButton } from "@/components/ui";
import type { CustomerField } from "@/domain/customers/customer";
import {
  createCustomer,
  findSimilarCustomers,
  setCustomerActive,
  type CreatedCustomer,
  type CustomerFormState,
  type SimilarCustomer,
} from "@/server/customers/actions";

// Maschera «Aggiungi cliente» (cap. 12.2 e 16, decisioni del 4 novembre 2026). Riutilizzabile:
// oggi in Clienti, domani nel preventivo. Restituisce il cliente creato (lo stesso record, non
// una copia) con onCreated; «Usa questo cliente» restituisce un cliente già esistente con onUse.

type Callbacks = {
  onCreated: (customer: CreatedCustomer) => void;
  onUse: (customer: CreatedCustomer) => void;
  canReactivate: boolean;
};

const debounceMs = 400;

function SimilarCustomers({
  results,
  error,
  onUse,
  canReactivate,
}: {
  results: SimilarCustomer[];
  error: string | null;
} & Pick<Callbacks, "onUse" | "canReactivate">) {
  const [pending, startTransition] = useTransition();
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  function reactivate(customer: SimilarCustomer) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", customer.id);
      formData.set("active", "true");
      const result = await setCustomerActive({ error: null }, formData);
      if (result.error) setReactivateError(result.error);
      else onUse({ id: customer.id, name: customer.name });
    });
  }

  return (
    <div aria-live="polite" data-testid="similar-customers">
      {error ? <p className="text-[13px] text-warning">{error}</p> : null}
      {results.length > 0 ? (
        <div className="rounded-[10px] bg-info-bg p-3 text-info">
          <p className="text-[13px] font-medium">Clienti simili già presenti:</p>
          <ul className="mt-2 space-y-2">
            {results.map((customer) => (
              <li key={customer.id} className="flex flex-wrap items-center gap-2 text-ink">
                <span className="font-medium">{customer.name}</span>
                {customer.city ? <span className="text-ink-muted">· {customer.city}</span> : null}
                <span className="text-[13px] text-ink-muted">({customer.reason})</span>
                {!customer.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
                {customer.isActive ? (
                  <button
                    type="button"
                    className={textButton}
                    onClick={() => onUse({ id: customer.id, name: customer.name })}
                  >
                    Usa questo cliente
                  </button>
                ) : canReactivate ? (
                  <button
                    type="button"
                    className={textButton}
                    disabled={pending}
                    onClick={() => reactivate(customer)}
                  >
                    {pending ? "Riattivazione…" : "Riattiva"}
                  </button>
                ) : (
                  <span className="text-[13px] text-ink-muted">
                    Cliente disattivato: chiedi a un responsabile
                  </span>
                )}
              </li>
            ))}
          </ul>
          {reactivateError ? (
            <p className="mt-2 text-[13px] text-warning">{reactivateError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const initialState: CustomerFormState = { error: null, fieldErrors: {} };

// Il modulo della maschera, usato nella finestra e nella pagina «Nuovo cliente».
export function CustomerQuickForm({ onCreated, onUse, canReactivate }: Callbacks) {
  const [state, formAction] = useActionState(createCustomer, initialState);
  const [similar, setSimilar] = useState<{ results: SimilarCustomer[]; error: string | null }>({
    results: [],
    error: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef("");

  useEffect(() => {
    if (state.created) onCreated(state.created);
    // Solo quando arriva un cliente appena creato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.created?.id]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Clienti simili mentre si scrive nome, partita IVA o codice fiscale, con un piccolo ritardo.
  function onInput(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const read = (name: string) => {
      const field = form.elements.namedItem(name);
      return field instanceof HTMLInputElement ? field.value : "";
    };
    const query = { name: read("name"), vatNumber: read("vatNumber"), taxCode: read("taxCode") };
    const key = JSON.stringify(query);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (key === lastQuery.current) return;
      lastQuery.current = key;
      setSimilar(await findSimilarCustomers(query));
    }, debounceMs);
  }

  const value = (name: CustomerField) => state.values?.[name] ?? "";

  return (
    <ActionForm action={formAction} onInput={onInput} className="space-y-5">
      <input type="hidden" name="creationKey" defaultValue="" />
      {/* Dopo un errore i campi si ricreano con i valori scritti (anche i menu a tendina). */}
      <div key={JSON.stringify(state.values ?? {})} className="space-y-5">
        <QuickCustomerFields value={value} errors={state.fieldErrors} />
      </div>
      <SimilarCustomers {...similar} onUse={onUse} canReactivate={canReactivate} />
      <ConfirmDifferent show={Boolean(state.needsConfirmation)} />
      <SubmitButton pendingLabel="Creazione…" className={primaryButton}>
        Crea cliente
      </SubmitButton>
      <ActionFeedback state={{ ...state, message: null }} />
    </ActionForm>
  );
}

// Pulsante e finestra «Aggiungi cliente»: focus dentro la finestra, Esc la chiude, il focus
// torna al pulsante.
export function AddCustomerDialog({ onCreated, onUse, canReactivate }: Callbacks) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [opening, setOpening] = useState(0);

  function open() {
    // Ogni apertura parte da un modulo vuoto.
    setOpening((count) => count + 1);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => {
      const name = dialogRef.current?.querySelector<HTMLInputElement>('input[name="name"]');
      name?.focus();
    });
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button ref={buttonRef} type="button" className={primaryButton} onClick={open}>
        Aggiungi cliente
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => buttonRef.current?.focus()}
        className="m-auto w-[min(640px,calc(100vw-32px))] rounded-2xl bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,.25)] backdrop:bg-black/30"
      >
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-[20px] font-semibold">
              Aggiungi cliente
            </h2>
            <button type="button" className={secondaryButton} onClick={close}>
              Annulla
            </button>
          </div>
          {opening > 0 ? (
            <CustomerQuickForm
              key={opening}
              canReactivate={canReactivate}
              onCreated={(customer) => {
                close();
                onCreated(customer);
              }}
              onUse={(customer) => {
                close();
                onUse(customer);
              }}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
