import { customerCompleteness, type CustomerData } from "@/domain/customers/customer";

// Clienti da completare per la dashboard (cap. 16.3, clienti C, decisioni del 4 novembre 2026).
// La completezza si calcola qui, sul server, rileggendo le schede: per non leggerle tutte si
// controllano al massimo i primi `incompleteScanLimit` clienti attivi in ordine di nome. Oltre
// quel numero si scrive solo «e altri», senza contare (backlog 5c: completezza nel database).
export const incompleteScanLimit = 500;
export const incompleteSampleSize = 5;

type Scanned = CustomerData & { id: string; isActive: boolean };

export type IncompleteSummary = {
  // Clienti attivi controllati (al massimo il limite).
  scanned: number;
  // Incompleti tra quelli controllati.
  total: number;
  // I primi nomi, con il collegamento alla scheda; nessun altro dato.
  sample: { id: string; name: string }[];
  // Ci sono altri clienti attivi oltre il limite, non controllati.
  truncated: boolean;
};

// `customers` sono i clienti attivi già in ordine di nome; `truncated` dice se ce n'erano altri.
export function summarizeIncomplete(customers: Scanned[], truncated: boolean): IncompleteSummary {
  const incomplete = customers.filter(
    (customer) => customer.isActive && !customerCompleteness(customer).complete,
  );
  return {
    scanned: customers.length,
    total: incomplete.length,
    sample: incomplete
      .slice(0, incompleteSampleSize)
      .map((customer) => ({ id: customer.id, name: customer.name })),
    truncated,
  };
}

// Testi del riquadro, in italiano semplice e onesti sui limiti.
export function incompleteHeadline(summary: IncompleteSummary): string {
  if (summary.truncated) {
    return `Almeno ${summary.total} ${summary.total === 1 ? "cliente da completare" : "clienti da completare"} tra i primi ${summary.scanned} clienti attivi.`;
  }
  if (summary.scanned === 0) return "Nessun cliente attivo inserito.";
  if (summary.total === 0) return "Tutti i clienti attivi sono completi per la fatturazione.";
  return summary.total === 1
    ? "1 cliente attivo da completare per la fatturazione."
    : `${summary.total} clienti attivi da completare per la fatturazione.`;
}

// «e altri 3», oppure «e altri» quando oltre il limite non si è contato.
export function incompleteOthers(summary: IncompleteSummary): string | null {
  const others = summary.total - summary.sample.length;
  if (summary.truncated) return "e altri";
  return others > 0 ? `e altri ${others}` : null;
}
