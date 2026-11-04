// Ricerca nell'elenco clienti per nome, partita IVA, codice fiscale, PEC ed email dei referenti
// attivi (decisioni del 4 novembre 2026). La ricerca vera la fa il database
// (`search_customers`), con i suoi limiti: testo da 3 a 100 caratteri e 20 ricerche al minuto.
export const minSearchLength = 3;
export const maxSearchLength = 100;

export type PreparedSearch =
  { kind: "none" } | { kind: "short" } | { kind: "long" } | { kind: "search"; term: string };

export function prepareCustomerSearch(raw: string | undefined): PreparedSearch {
  const term = (raw ?? "").trim().replace(/\s+/g, " ");
  if (term === "") return { kind: "none" };
  if (term.length < minSearchLength) return { kind: "short" };
  if (term.length > maxSearchLength) return { kind: "long" };
  return { kind: "search", term };
}

export const searchMessages = {
  short: `Scrivi almeno ${minSearchLength} caratteri per cercare.`,
  long: `Il testo da cercare può avere al massimo ${maxSearchLength} caratteri.`,
  busy: "Troppe ricerche ravvicinate, riprova tra un minuto.",
  failed: "Ricerca non riuscita. Riprova.",
} as const;
