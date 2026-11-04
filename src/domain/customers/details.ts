import { countryName, type FieldErrors, type Parsed } from "@/domain/company/company";
import { normalizeCode } from "@/domain/company/identifiers";

// Referenti e indirizzi di consegna dei clienti (cap. 16.2 «Uso commerciale», decisioni del
// 4 novembre 2026). Le stesse regole sono anche nel database.

function text(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed;
}

function code(value: string | undefined): string | null {
  const normalized = normalizeCode(value ?? "");
  return normalized === "" ? null : normalized;
}

export const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Telefono: cifre, spazi, «+» iniziale, trattini, parentesi, punti e barre, con almeno 6 cifre
// (al massimo 20). Si salva come scritto, con gli spazi ripuliti.
export function isValidPhone(phone: string): boolean {
  if (phone.length > 40 || !/^\+?[0-9 ()./-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 6 && digits <= 20;
}

export type ContactData = {
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};
export type ContactField = keyof ContactData;
export type ContactInput = Partial<Record<ContactField, string>>;

export function parseContact(raw: ContactInput): Parsed<ContactData, ContactField> {
  const errors: FieldErrors<ContactField> = {};
  const value: ContactData = {
    name: text(raw.name) ?? "",
    role: text(raw.role),
    email: text(raw.email)?.toLowerCase() ?? null,
    phone: text(raw.phone),
  };
  if (!value.name) errors.name = "Inserisci il nome del referente.";
  else if (value.name.length > 120) errors.name = "Al massimo 120 caratteri.";
  if (value.role && value.role.length > 80) errors.role = "Al massimo 80 caratteri.";
  if (value.email && (value.email.length > 254 || !emailPattern.test(value.email))) {
    errors.email = "Email non valida.";
  }
  if (value.phone && !isValidPhone(value.phone)) {
    errors.phone =
      "Telefono non valido: usa cifre (almeno 6), spazi, +, trattini, parentesi, punti o barre.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export type AddressData = {
  description: string | null;
  street: string;
  postalCode: string | null;
  city: string;
  province: string | null;
  country: string;
};
export type AddressField = keyof AddressData;
export type AddressInput = Partial<Record<AddressField, string>>;

export function parseAddress(raw: AddressInput): Parsed<AddressData, AddressField> {
  const errors: FieldErrors<AddressField> = {};
  const value: AddressData = {
    description: text(raw.description),
    street: text(raw.street) ?? "",
    postalCode: code(raw.postalCode),
    city: text(raw.city) ?? "",
    province: code(raw.province),
    country: code(raw.country) ?? "",
  };
  if (value.description && value.description.length > 120) {
    errors.description = "Al massimo 120 caratteri.";
  }
  if (!value.street) errors.street = "Inserisci via e numero civico.";
  else if (value.street.length > 200) errors.street = "Al massimo 200 caratteri.";
  if (!value.city) errors.city = "Inserisci il comune.";
  else if (value.city.length > 120) errors.city = "Al massimo 120 caratteri.";
  if (!value.country) errors.country = "Scegli il paese (per l'Italia basta il pulsante «Italia»).";
  else if (!countryName(value.country)) {
    errors.country = "Paese non riconosciuto: usa il codice a due lettere (per esempio IT).";
  }
  if (value.postalCode && value.postalCode.length > 20) errors.postalCode = "CAP troppo lungo.";
  if (value.province && value.province.length > 60) errors.province = "Provincia troppo lunga.";
  const italy = value.country === "IT";
  if (italy && value.postalCode && !/^\d{5}$/.test(value.postalCode)) {
    errors.postalCode = "Il CAP italiano ha 5 cifre.";
  }
  if (italy && value.province && !/^[A-Z]{2}$/.test(value.province)) {
    errors.province = "La provincia italiana è la sigla di 2 lettere (per esempio RM).";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
