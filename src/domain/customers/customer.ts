import { countryName, type FieldErrors, type Parsed } from "@/domain/company/company";
import { isValidTaxCode, isValidVatNumber, normalizeCode } from "@/domain/company/identifiers";
import { isDay } from "@/lib/rome-day";

// Anagrafica clienti (cap. 16.2 e 16.3, decisioni del 4 novembre 2026): per salvare basta il
// nome; tutto il resto è facoltativo ma, se compilato, deve essere valido.

export const subjectTypes = [
  "company",
  "professional",
  "private",
  "public_administration",
  "foreign",
] as const;
export type SubjectType = (typeof subjectTypes)[number];

export const subjectTypeLabels: Record<SubjectType, string> = {
  company: "Azienda",
  professional: "Professionista",
  private: "Privato",
  public_administration: "Pubblica Amministrazione",
  foreign: "Estero",
};

export const vatRegimes = ["ordinary", "exempt", "reverse_charge", "intent_declaration"] as const;
export type VatRegime = (typeof vatRegimes)[number];

export const vatRegimeLabels: Record<VatRegime, string> = {
  ordinary: "Ordinario",
  exempt: "Esente (con natura)",
  reverse_charge: "Reverse charge",
  intent_declaration: "Dichiarazione d'intento",
};

export type CustomerData = {
  name: string;
  subjectType: SubjectType | null;
  vatNumber: string | null;
  taxCode: string | null;
  foreignTaxId: string | null;
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
  sdiCode: string | null;
  pec: string | null;
  paOfficeCode: string | null;
  paOfficeName: string | null;
  splitPayment: boolean | null;
  vatRegime: VatRegime | null;
  vatExemptionNature: string | null;
  intentDeclarationNumber: string | null;
  intentDeclarationDate: string | null;
};

export type CustomerField = keyof CustomerData;
export type CustomerInput = Partial<Record<CustomerField, string>>;

function text(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed;
}

function code(value: string | undefined): string | null {
  const normalized = normalizeCode(value ?? "");
  return normalized === "" ? null : normalized;
}

function oneOf<Value extends string>(options: readonly Value[], value: string | undefined) {
  return options.find((option) => option === value) ?? null;
}

// Split payment arriva come «si», «no» o vuoto (non ancora scelto).
function yesNo(value: string | undefined): boolean | null {
  if (value === "si") return true;
  if (value === "no") return false;
  return null;
}

export function parseCustomer(raw: CustomerInput): Parsed<CustomerData, CustomerField> {
  const errors: FieldErrors<CustomerField> = {};
  const value: CustomerData = {
    name: text(raw.name) ?? "",
    subjectType: oneOf(subjectTypes, raw.subjectType),
    vatNumber: code(raw.vatNumber),
    taxCode: code(raw.taxCode),
    foreignTaxId: text(raw.foreignTaxId),
    addressStreet: text(raw.addressStreet),
    addressPostalCode: code(raw.addressPostalCode),
    addressCity: text(raw.addressCity),
    addressProvince: code(raw.addressProvince),
    addressCountry: code(raw.addressCountry),
    sdiCode: code(raw.sdiCode),
    pec: text(raw.pec)?.toLowerCase() ?? null,
    paOfficeCode: code(raw.paOfficeCode),
    paOfficeName: text(raw.paOfficeName),
    splitPayment: yesNo(raw.splitPayment),
    vatRegime: oneOf(vatRegimes, raw.vatRegime),
    vatExemptionNature: text(raw.vatExemptionNature),
    intentDeclarationNumber: text(raw.intentDeclarationNumber),
    intentDeclarationDate: text(raw.intentDeclarationDate),
  };

  if (!value.name) errors.name = "Inserisci il nome o la ragione sociale.";
  else if (value.name.length > 200) errors.name = "Al massimo 200 caratteri.";
  if (raw.subjectType && !value.subjectType) errors.subjectType = "Tipo di soggetto non valido.";
  if (value.vatNumber && !isValidVatNumber(value.vatNumber)) {
    errors.vatNumber =
      "Partita IVA non valida: servono 11 cifre con la cifra di controllo corretta.";
  }
  if (value.taxCode && !isValidTaxCode(value.taxCode)) {
    errors.taxCode =
      "Codice fiscale non valido: servono 16 caratteri (persona) o 11 cifre, con il controllo corretto.";
  }
  if (value.foreignTaxId && value.foreignTaxId.length > 40) {
    errors.foreignTaxId = "Al massimo 40 caratteri.";
  }
  if (value.addressCountry && !countryName(value.addressCountry)) {
    errors.addressCountry =
      "Nazione non riconosciuta: usa il codice a due lettere (per esempio IT).";
  }
  const italy = value.addressCountry === "IT";
  if (italy && value.addressPostalCode && !/^\d{5}$/.test(value.addressPostalCode)) {
    errors.addressPostalCode = "Il CAP italiano ha 5 cifre.";
  }
  if (italy && value.addressProvince && !/^[A-Z]{2}$/.test(value.addressProvince)) {
    errors.addressProvince = "La provincia italiana è la sigla di 2 lettere (per esempio RM).";
  }
  if (value.sdiCode && !/^[A-Z0-9]{7}$/.test(value.sdiCode)) {
    errors.sdiCode = "Il codice destinatario ha 7 caratteri, lettere e cifre.";
  }
  if (value.pec && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.pec)) {
    errors.pec = "PEC non valida.";
  }
  if (value.paOfficeCode && !/^[A-Z0-9]{6}$/.test(value.paOfficeCode)) {
    errors.paOfficeCode = "Il codice univoco ufficio ha 6 caratteri, lettere e cifre.";
  }
  if (raw.vatRegime && !value.vatRegime) errors.vatRegime = "Regime IVA non valido.";
  if (value.intentDeclarationDate && !isDay(value.intentDeclarationDate)) {
    errors.intentDeclarationDate = "Data non valida.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

// Codice destinatario che si userà in fattura: privato e sola PEC 0000000, estero XXXXXXX;
// per la Pubblica Amministrazione il recapito è il codice univoco ufficio.
export function effectiveRecipientCode(customer: CustomerData): string | null {
  switch (customer.subjectType) {
    case "private":
      return "0000000";
    case "foreign":
      return "XXXXXXX";
    case "public_administration":
      return customer.paOfficeCode;
    default:
      return customer.sdiCode ?? (customer.pec ? "0000000" : null);
  }
}

export type Completeness = { complete: boolean; missing: string[] };

// «Completa per fatturazione» secondo il tipo di soggetto (decisione del 4 novembre 2026).
export function customerCompleteness(customer: CustomerData): Completeness {
  const missing: string[] = [];
  const type = customer.subjectType;
  if (!type) missing.push("tipo di soggetto");

  if (type === "company" || type === "professional") {
    if (!customer.vatNumber) missing.push("partita IVA");
  }
  if (type === "professional" || type === "private" || type === "public_administration") {
    if (!customer.taxCode) missing.push("codice fiscale");
  }
  if (type === "public_administration") {
    if (!customer.paOfficeCode) missing.push("codice univoco ufficio");
    if (!customer.paOfficeName) missing.push("nome dell'ufficio");
    if (customer.splitPayment === null) missing.push("scelta sullo split payment");
  }
  if (type === "foreign") {
    if (!customer.foreignTaxId) missing.push("identificativo fiscale estero");
    if (customer.addressCountry === "IT") missing.push("nazione estera (non Italia)");
  }

  const address = [
    customer.addressStreet,
    customer.addressPostalCode,
    customer.addressCity,
    customer.addressCountry,
  ];
  const needsProvince = customer.addressCountry === "IT" && !customer.addressProvince;
  if (address.some((part) => !part) || needsProvince) missing.push("sede legale completa");

  if ((type === "company" || type === "professional") && !effectiveRecipientCode(customer)) {
    missing.push("codice destinatario o PEC");
  }

  if (!customer.vatRegime) missing.push("regime IVA");
  if (customer.vatRegime === "exempt" && !customer.vatExemptionNature) {
    missing.push("natura dell'esenzione");
  }
  if (customer.vatRegime === "intent_declaration") {
    if (!customer.intentDeclarationNumber) missing.push("numero della dichiarazione d'intento");
    if (!customer.intentDeclarationDate) missing.push("data della dichiarazione d'intento");
  }

  return { complete: missing.length === 0, missing };
}
