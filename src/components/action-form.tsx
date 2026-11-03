"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type SubmitEvent,
} from "react";
import { useFormStatus } from "react-dom";

// Moduli comuni (regola: ogni creazione è protetta dal doppio invio).
// - ActionForm rifiuta un secondo invio finché il primo non è finito, anche con un doppio clic
//   più veloce dell'aggiornamento dello schermo, e riempie la chiave di creazione (campo
//   nascosto «creationKey»), che il database usa come seconda difesa.
// - SubmitButton durante l'invio si disabilita e mostra il testo d'attesa.
// - ActionFeedback annuncia l'esito ai lettori di schermo; la conferma sparisce da sola.

export type ActionResult = { error: string | null; message?: string | null; done?: number };

function WhenIdle({ onIdle }: { onIdle: () => void }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!pending) onIdle();
  }, [pending, onIdle]);
  return null;
}

export function ActionForm({ children, onSubmit, ...props }: ComponentProps<"form">) {
  const busy = useRef(false);
  const release = useCallback(() => {
    busy.current = false;
  }, []);
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (busy.current) {
      event.preventDefault();
      return;
    }
    busy.current = true;
    // Chiave di creazione: generata al primo invio e uguale per gli eventuali invii ripetuti.
    const key = event.currentTarget.elements.namedItem("creationKey");
    if (key instanceof HTMLInputElement && !key.value) key.value = crypto.randomUUID();
    onSubmit?.(event);
  }
  return (
    <form {...props} onSubmit={handleSubmit}>
      <WhenIdle onIdle={release} />
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

const confirmationSeconds = 4;

export function ActionFeedback({ state }: { state: ActionResult }) {
  const [hiddenDone, setHiddenDone] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!state.message) return;
    const timer = setTimeout(() => setHiddenDone(state.done), confirmationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [state.message, state.done]);

  const showMessage = state.message && hiddenDone !== state.done;
  return (
    <>
      <p
        role="alert"
        className={state.error ? "mt-2 rounded-lg bg-warning-bg px-3 py-2 text-warning" : "sr-only"}
      >
        {state.error ?? ""}
      </p>
      <p
        role="status"
        className={
          showMessage
            ? "mt-2 inline-block rounded-lg bg-success-bg px-3 py-1 text-[13px] text-success motion-safe:animate-[fade-in_150ms_ease-out]"
            : "sr-only"
        }
      >
        {showMessage ? state.message : ""}
      </p>
    </>
  );
}
