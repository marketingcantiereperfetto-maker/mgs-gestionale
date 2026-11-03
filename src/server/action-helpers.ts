import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/permissions";

// Parti comuni delle azioni su società e brand.

// Esito di ogni azione: errore oppure conferma breve. «done» conta le operazioni riuscite.
export type Result = { error: string | null; message?: string | null; done?: number };

export const notAllowed = "Solo il titolare può gestire società e brand.";
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Chiave di creazione generata dal modulo: lo stesso invio ripetuto non crea due record.
export function creationKey(formData: FormData): string | null {
  const key = field(formData, "creationKey");
  return uuidPattern.test(key) ? key : null;
}

export async function canManageCompanies(): Promise<boolean> {
  return can(await getCurrentUser(), "companies.manage");
}

export function succeeded(state: Result, message: string): Result {
  return { error: null, message, done: (state.done ?? 0) + 1 };
}

export type DatabaseError = { code?: string; message: string };

export function isDuplicate(error: DatabaseError, constraint: string): boolean {
  return error.code === "23505" && error.message.includes(constraint);
}

// Vincoli di unicità con il loro messaggio (le regole sono anche nel database).
const duplicateMessages: Record<string, string> = {
  company_bank_accounts_company_iban_key: "Questo conto è già presente.",
  companies_vat_number_key: "Esiste già una società con questa partita IVA.",
  brands_name_key_key:
    "Esiste già un brand con questo nome (controlla anche tra i disattivati e, se serve, riattivalo).",
};

// Errori del database tradotti in italiano, senza dettagli tecnici.
export function databaseMessage(error: DatabaseError): string {
  if (error.code === "42501") return notAllowed;
  if (error.code === "P0001") return `${error.message}.`;
  for (const [constraint, message] of Object.entries(duplicateMessages)) {
    if (isDuplicate(error, constraint)) return message;
  }
  if (error.code === "23514") return "Un dato non rispetta il formato richiesto.";
  return "Salvataggio non riuscito. Riprova.";
}
