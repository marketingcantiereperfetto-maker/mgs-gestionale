import type { Parsed } from "./company";

// Nome del brand: obbligatorio, spazi in eccesso tolti. L'unicità (senza differenze di
// maiuscole e spazi) la garantisce il database.
export function parseBrandName(raw: string): Parsed<{ name: string }, "name"> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, errors: { name: "Inserisci il nome del brand." } };
  return { ok: true, value: { name } };
}

// Confronto dei nomi come nel database: maiuscole e spazi non contano.
export function brandNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
