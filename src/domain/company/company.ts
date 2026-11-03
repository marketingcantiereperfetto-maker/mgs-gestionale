import { isValidIban, isValidTaxCode, isValidVatNumber, normalizeCode } from "./identifiers";

// Dati della società (cap. 3 e 5, decisioni del 3 novembre 2026): obbligatoria solo la ragione
// sociale; gli altri campi sono facoltativi ma, se compilati, devono essere validi.
export const companyFields = [
  "legalName",
  "vatNumber",
  "taxCode",
  "email",
  "addressStreet",
  "addressPostalCode",
  "addressCity",
  "addressProvince",
  "addressCountry",
] as const;

export type CompanyField = (typeof companyFields)[number];
export type CompanyData = { legalName: string } & Record<
  Exclude<CompanyField, "legalName">,
  string | null
>;
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;
export type Parsed<Value, Field extends string> =
  { ok: true; value: Value } | { ok: false; errors: FieldErrors<Field> };

const regionNames = new Intl.DisplayNames(["it"], { type: "region" });

// Nome del paese in italiano dal codice a due lettere (IT → Italia); null se sconosciuto.
export function countryName(code: string): string | null {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const name = regionNames.of(code);
  return name && name !== code && name !== "Regione sconosciuta" ? name : null;
}

function text(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed;
}

function code(value: string | undefined): string | null {
  const normalized = normalizeCode(value ?? "");
  return normalized === "" ? null : normalized;
}

export function parseCompany(
  raw: Partial<Record<CompanyField, string>>,
): Parsed<CompanyData, CompanyField> {
  const errors: FieldErrors<CompanyField> = {};
  const legalName = text(raw.legalName);
  const vatNumber = code(raw.vatNumber);
  const taxCode = code(raw.taxCode);
  const email = text(raw.email)?.toLowerCase() ?? null;
  const addressCountry = code(raw.addressCountry);

  if (!legalName) errors.legalName = "Inserisci la ragione sociale.";
  if (vatNumber && !isValidVatNumber(vatNumber)) {
    errors.vatNumber =
      "Partita IVA non valida: servono 11 cifre con la cifra di controllo corretta.";
  }
  if (taxCode && !isValidTaxCode(taxCode)) {
    errors.taxCode =
      "Codice fiscale non valido: servono 16 caratteri (persona) o 11 cifre (società), con il controllo corretto.";
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = "Email non valida.";
  }
  if (addressCountry && !countryName(addressCountry)) {
    errors.addressCountry = "Paese non riconosciuto: usa il codice a due lettere (per esempio IT).";
  }

  if (!legalName || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      legalName,
      vatNumber,
      taxCode,
      email,
      addressStreet: text(raw.addressStreet),
      addressPostalCode: text(raw.addressPostalCode),
      addressCity: text(raw.addressCity),
      addressProvince: text(raw.addressProvince),
      addressCountry,
    },
  };
}

export type BankAccountField = "label" | "iban";
export type BankAccountData = { label: string | null; iban: string };

export function parseBankAccount(
  raw: Partial<Record<BankAccountField, string>>,
): Parsed<BankAccountData, BankAccountField> {
  const iban = code(raw.iban);
  if (!iban) return { ok: false, errors: { iban: "Inserisci l'IBAN." } };
  if (!isValidIban(iban)) {
    return { ok: false, errors: { iban: "IBAN non valido: controlla le cifre." } };
  }
  return { ok: true, value: { label: text(raw.label), iban } };
}

export type Readiness = {
  // Pronta quando non manca nessun dato obbligatorio per emettere.
  ready: boolean;
  missing: string[];
  // L'IBAN serve solo se si usa il bonifico: si segnala a parte.
  bankAccountMissing: boolean;
};

// Cosa manca per emettere preventivi (decisione del 2 novembre 2026).
export function companyReadiness(company: CompanyData, hasActiveBankAccount: boolean): Readiness {
  const missing: string[] = [];
  if (!company.vatNumber) missing.push("partita IVA");
  if (!company.taxCode) missing.push("codice fiscale");
  const address = [
    company.addressStreet,
    company.addressPostalCode,
    company.addressCity,
    company.addressProvince,
    company.addressCountry,
  ];
  if (address.some((part) => !part)) missing.push("sede legale completa");
  if (!company.email) missing.push("email");
  return { ready: missing.length === 0, missing, bankAccountMissing: !hasActiveBankAccount };
}
