import { normalizeCode } from "@/domain/company/identifiers";

// Ricerca nell'elenco clienti per nome, partita IVA, codice fiscale e PEC (precisazione del
// 4 novembre 2026). Il testo cercato diventa un filtro «or» di PostgREST: si tolgono i
// caratteri che hanno un significato nel filtro, così non si possono aggiungere condizioni.
export const maxSearchLength = 80;

export function customerSearchFilter(raw: string | undefined): string | null {
  const term = (raw ?? "")
    .replace(/[,()*%"\\]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxSearchLength);
  if (term.length < 2) return null;
  const code = normalizeCode(term);
  const parts = [`name.ilike.*${term}*`, `pec.ilike.*${term}*`];
  if (/^[A-Z0-9]+$/.test(code)) {
    parts.push(`vat_number.ilike.*${code}*`, `tax_code.ilike.*${code}*`);
  }
  return parts.join(",");
}
