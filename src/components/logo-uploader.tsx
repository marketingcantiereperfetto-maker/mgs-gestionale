"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import { ActionFeedback, type ActionResult } from "@/components/action-form";
import { primaryButton } from "@/components/ui";

// Caricamento di un logo. Il server controlla il contenuto vero del file e sceglie lui il nome;
// qui solo il blocco del doppio invio, il testo d'attesa e la conferma.
export function LogoUploader({
  target,
  id,
  logoUrl,
  alt,
}: {
  target: "brand" | "societa";
  id: string;
  // Indirizzo firmato (5 minuti), solo per mostrare l'anteprima.
  logoUrl: string | null;
  alt: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionResult>({ error: null });

  async function upload(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("target", target);
    body.set("id", id);
    try {
      const response = await fetch("/api/loghi", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (response.ok) {
        form.reset();
        setState((previous) => ({
          error: null,
          message: result.message ?? "Logo caricato.",
          done: (previous.done ?? 0) + 1,
        }));
        router.refresh();
      } else {
        setState({ error: result.error ?? "Caricamento non riuscito. Riprova." });
      }
    } catch {
      setState({ error: "Caricamento non riuscito: controlla la connessione e riprova." });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- indirizzo firmato a scadenza breve
        <img
          src={logoUrl}
          alt={alt}
          data-testid="logo-preview"
          className="max-h-24 max-w-60 rounded-lg border border-line/60 bg-card object-contain p-2"
        />
      ) : (
        <p className="text-ink-muted">Nessun logo caricato.</p>
      )}
      <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
        <label className="block text-[13px] text-ink-muted">
          File del logo (PNG, JPEG o WebP, fino a 1 MB)
          <input
            name="file"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block text-[14px] text-ink"
          />
        </label>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Caricamento…" : logoUrl ? "Sostituisci logo" : "Carica logo"}
        </button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}
