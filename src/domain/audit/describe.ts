import { countryName } from "@/domain/company/company";
import { subjectTypeLabels, type SubjectType } from "@/domain/customers/customer";
import { roleLabels, type UserRole } from "@/server/auth/permissions";

// Righe del registro delle modifiche in italiano semplice (decisioni del 3 novembre 2026):
// chi, cosa e, per le modifiche, solo i campi cambiati. Mai campi tecnici, percorsi dei file o
// indirizzi firmati; l'IBAN mascherato.

type Data = Record<string, unknown> | null;

export type AuditEntry = {
  id: number;
  occurredAt: string;
  actorId: string | null;
  table: string;
  recordId: string | null;
  action: "insert" | "update" | "delete";
  oldData: Data;
  newData: Data;
};

// Nomi attuali di persone, società e brand; per i dati cancellati si usa la fotografia della riga.
export type AuditNames = {
  people: Map<string, string>;
  companies: Map<string, string>;
  brands: Map<string, string>;
  customers: Map<string, string>;
};

// Senza «before» e «after» la riga dice solo che il campo è cambiato (dati personali dei clienti).
export type AuditChange = { label: string; before?: string; after?: string };
export type AuditLine = { actor: string; sentence: string; changes: AuditChange[] };

export const maintenanceActor = "Procedura di manutenzione";

// Tipi di dato per il filtro, con le tabelle che li contengono.
export const auditKinds = {
  societa: { label: "Società", tables: ["companies"] },
  conti: { label: "Conti bancari", tables: ["company_bank_accounts"] },
  brand: { label: "Brand", tables: ["brands"] },
  collegamenti: { label: "Collegamenti brand–società", tables: ["company_brands"] },
  profili: { label: "Profili e utenti", tables: ["profiles", "profile_companies"] },
  clienti: { label: "Clienti", tables: ["customers"] },
  referenti: { label: "Referenti dei clienti", tables: ["customer_contacts"] },
  indirizzi: { label: "Indirizzi di consegna", tables: ["customer_delivery_addresses"] },
} as const;

export type AuditKind = keyof typeof auditKinds;

const fieldLabels: Record<string, string> = {
  legal_name: "Ragione sociale",
  vat_number: "Partita IVA",
  tax_code: "Codice fiscale",
  email: "Email",
  address_street: "Via e numero civico",
  address_postal_code: "CAP",
  address_city: "Comune",
  address_province: "Provincia",
  address_country: "Paese",
  label: "Descrizione",
  iban: "IBAN",
  name: "Nome",
  full_name: "Nome",
  role: "Ruolo",
};

export function maskIban(iban: string): string {
  return iban.length > 8 ? `${iban.slice(0, 4)} … ${iban.slice(-4)}` : "…";
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function show(field: string, value: unknown): string {
  const plain = text(value);
  if (plain === null) return "(vuoto)";
  if (field === "iban") return maskIban(plain);
  if (field === "role") return roleLabels[plain as UserRole] ?? plain;
  if (field === "subject_type") return subjectTypeLabels[plain as SubjectType] ?? plain;
  if (field === "address_country") {
    const name = countryName(plain);
    return name ? `${plain} (${name})` : plain;
  }
  return plain;
}

// Clienti: con il valore solo nome e tipo; degli altri campi solo il nome del campo cambiato
// (decisione del 4 novembre 2026, dati personali).
const customerFieldLabels: Record<string, string> = {
  name: "Nome o ragione sociale",
  subject_type: "Tipo di soggetto",
  vat_number: "Partita IVA",
  tax_code: "Codice fiscale",
  foreign_tax_id: "Identificativo fiscale estero",
  address_street: "Via e numero civico",
  address_postal_code: "CAP",
  address_city: "Comune",
  address_province: "Provincia",
  address_country: "Nazione",
  sdi_code: "Codice destinatario",
  pec: "PEC",
  pa_office_code: "Codice univoco ufficio",
  pa_office_name: "Nome dell'ufficio",
  split_payment: "Split payment",
  vat_regime: "Regime IVA",
  vat_exemption_nature: "Natura dell'esenzione",
  intent_declaration_number: "Numero della dichiarazione d'intento",
  intent_declaration_date: "Data della dichiarazione d'intento",
  group_company_id: "Società del gruppo",
};
const customerFieldsWithValue = new Set(["name", "subject_type"]);

function changed(entry: AuditEntry, field: string): boolean {
  return (entry.oldData?.[field] ?? null) !== (entry.newData?.[field] ?? null);
}

// Clienti: le righe scritte dal registro ridotto hanno «changed_fields» (solo i nomi dei campi);
// le righe più vecchie, dei soli clienti di prova, avevano la riga intera.
function customerChanges(entry: AuditEntry): AuditChange[] {
  const withValue = ["name", "subject_type"]
    .filter((field) => changed(entry, field))
    .map((field) => ({
      label: customerFieldLabels[field]!,
      before: show(field, entry.oldData?.[field]),
      after: show(field, entry.newData?.[field]),
    }));
  const listed = entry.newData?.changed_fields;
  const names = Array.isArray(listed)
    ? listed.filter((field): field is string => typeof field === "string")
    : Object.keys(customerFieldLabels).filter(
        (field) => field in (entry.newData ?? {}) && changed(entry, field),
      );
  const withoutValue = names
    .filter((field) => !customerFieldsWithValue.has(field) && field in customerFieldLabels)
    .map((field) => ({ label: customerFieldLabels[field]! }));
  return [...withValue, ...withoutValue];
}

// Referenti e indirizzi: il registro ha solo i nomi dei campi cambiati, mai i valori
// (decisione del 4 novembre 2026). Principale e predefinito hanno la loro frase.
const detailFieldLabels: Record<string, string> = {
  name: "Nome",
  role: "Ruolo",
  email: "Email",
  phone: "Telefono",
  description: "Descrizione",
  street: "Via e numero civico",
  postal_code: "CAP",
  city: "Comune",
  province: "Provincia",
  country: "Paese",
};

function listedFields(entry: AuditEntry): string[] {
  const listed = (entry.newData ?? entry.oldData)?.changed_fields;
  return Array.isArray(listed)
    ? listed.filter((field): field is string => typeof field === "string")
    : [];
}

function detailChanges(entry: AuditEntry): AuditChange[] {
  return listedFields(entry)
    .filter((field) => field in detailFieldLabels)
    .map((field) => ({ label: detailFieldLabels[field]! }));
}

const detailTables = new Set(["customer_contacts", "customer_delivery_addresses"]);

// Solo i campi con un nome in italiano: quelli tecnici non compaiono mai.
function visibleChanges(entry: AuditEntry): AuditChange[] {
  if (entry.action !== "update") return [];
  if (entry.table === "customers") return customerChanges(entry);
  if (detailTables.has(entry.table)) return detailChanges(entry);
  return Object.keys(fieldLabels)
    .filter((field) => field in (entry.newData ?? {}) && changed(entry, field))
    .map((field) => ({
      label: fieldLabels[field]!,
      before: show(field, entry.oldData?.[field]),
      after: show(field, entry.newData?.[field]),
    }));
}

function value(entry: AuditEntry, field: string): unknown {
  return entry.newData?.[field] ?? entry.oldData?.[field];
}

function quoted(name: string | null | undefined, fallback: string): string {
  return name ? `«${name}»` : fallback;
}

type Preposition = "a" | "da" | "di";

const withArticle: Record<Preposition, string> = { a: "alla", da: "dalla", di: "della" };

// «alla società «X»» oppure «a una società non più presente».
function companyRef(names: AuditNames, id: unknown, preposition: Preposition): string {
  const known = typeof id === "string" ? names.companies.get(id) : undefined;
  return known
    ? `${withArticle[preposition]} società «${known}»`
    : `${preposition} una società non più presente`;
}

function brandRef(names: AuditNames, id: unknown): string {
  const known = typeof id === "string" ? names.brands.get(id) : undefined;
  return known ? `il brand «${known}»` : "un brand non più presente";
}

function personName(names: AuditNames, id: unknown): string {
  return (typeof id === "string" && names.people.get(id)) || "un utente non più presente";
}

function activeSentence(entry: AuditEntry, subject: string, female: boolean): string | null {
  if (!changed(entry, "is_active")) return null;
  const active = entry.newData?.is_active === true;
  const verb = active ? "riattivato" : "disattivato";
  return `ha ${verb} ${female ? "la" : "il"} ${subject}`;
}

function describeCompany(entry: AuditEntry): string {
  const subject = `società ${quoted(text(value(entry, "legal_name")), "senza nome")}`;
  if (entry.action === "insert") return `ha creato la ${subject}`;
  if (entry.action === "delete") return `ha cancellato la ${subject}`;
  const active = activeSentence(entry, subject, true);
  if (active) return active;
  if (changed(entry, "fallback_logo_path")) {
    return entry.oldData?.fallback_logo_path
      ? `ha sostituito il logo di riserva della ${subject}`
      : `ha caricato il logo di riserva della ${subject}`;
  }
  return `ha modificato la ${subject}`;
}

function describeBankAccount(entry: AuditEntry, names: AuditNames): string {
  const iban = text(value(entry, "iban"));
  const subject = `il conto ${iban ? maskIban(iban) : ""} ${companyRef(names, value(entry, "company_id"), "di")}`;
  if (entry.action === "insert") return `ha aggiunto ${subject}`;
  if (entry.action === "delete") return `ha cancellato ${subject}`;
  if (changed(entry, "is_active")) {
    return `ha ${entry.newData?.is_active ? "riattivato" : "disattivato"} ${subject}`;
  }
  if (changed(entry, "is_default")) {
    return entry.newData?.is_default
      ? `ha reso predefinito ${subject}`
      : `ha tolto il predefinito al conto ${iban ? maskIban(iban) : ""}`;
  }
  return `ha modificato ${subject}`;
}

function describeBrand(entry: AuditEntry): string {
  const subject = `brand ${quoted(text(value(entry, "name")), "senza nome")}`;
  if (entry.action === "insert") return `ha creato il ${subject}`;
  if (entry.action === "delete") return `ha cancellato il ${subject}`;
  const active = activeSentence(entry, subject, false);
  if (active) return active;
  if (changed(entry, "logo_path")) {
    return entry.oldData?.logo_path
      ? `ha sostituito il logo del ${subject}`
      : `ha caricato il logo del ${subject}`;
  }
  return `ha modificato il ${subject}`;
}

function describeLink(entry: AuditEntry, names: AuditNames): string {
  const brand = brandRef(names, value(entry, "brand_id"));
  const companyId = value(entry, "company_id");
  return entry.action === "delete"
    ? `ha tolto ${brand} ${companyRef(names, companyId, "da")}`
    : `ha collegato ${brand} ${companyRef(names, companyId, "a")}`;
}

function describeProfile(entry: AuditEntry, names: AuditNames): string {
  const own = entry.actorId !== null && entry.actorId === value(entry, "user_id");
  const whose = own
    ? "il proprio profilo"
    : `il profilo di ${personName(names, value(entry, "user_id"))}`;
  if (entry.action === "insert") return `ha creato ${whose}`;
  if (entry.action === "delete") return `ha cancellato ${whose}`;
  if (changed(entry, "password_set_at") && entry.newData?.password_set_at) {
    return own ? "ha scelto la propria password" : `ha segnato la password di ${whose}`;
  }
  const active = changed(entry, "is_active");
  if (active) return `ha ${entry.newData?.is_active ? "riattivato" : "disattivato"} ${whose}`;
  if (changed(entry, "full_name")) {
    return own
      ? "ha cambiato il nome del proprio profilo"
      : `ha cambiato il nome del profilo di ${personName(names, value(entry, "user_id"))}`;
  }
  return `ha modificato ${whose}`;
}

function describeProfileCompany(entry: AuditEntry, names: AuditNames): string {
  const person = personName(names, value(entry, "user_id"));
  const companyId = value(entry, "company_id");
  return entry.action === "delete"
    ? `ha scollegato ${person} ${companyRef(names, companyId, "da")}`
    : `ha collegato ${person} ${companyRef(names, companyId, "a")}`;
}

function describeCustomer(entry: AuditEntry): string {
  const subject = `cliente ${quoted(text(value(entry, "name")), "senza nome")}`;
  if (entry.action === "insert") return `ha creato il ${subject}`;
  if (entry.action === "delete") return `ha cancellato il ${subject}`;
  const active = activeSentence(entry, subject, false);
  if (active) return active;
  return `ha modificato il ${subject}`;
}

function customerRef(names: AuditNames, id: unknown): string {
  const known = typeof id === "string" ? names.customers.get(id) : undefined;
  return known ? `del cliente «${known}»` : "di un cliente non più presente";
}

// Né il nome del referente né la descrizione dell'indirizzo: nel registro non ci sono.
function describeDetail(entry: AuditEntry, names: AuditNames, kind: "contact" | "address") {
  const what = kind === "contact" ? "un referente" : "un indirizzo di consegna";
  const owner = customerRef(names, value(entry, "customer_id"));
  if (entry.action === "insert") return `ha aggiunto ${what} ${owner}`;
  if (entry.action === "delete") return `ha cancellato ${what} ${owner}`;
  if (changed(entry, "is_active")) {
    return `ha ${entry.newData?.is_active ? "riattivato" : "disattivato"} ${what} ${owner}`;
  }
  const fields = listedFields(entry);
  const flag = kind === "contact" ? "is_primary" : "is_default";
  if (fields.length === 1 && fields[0] === flag) {
    return kind === "contact"
      ? `ha cambiato il referente principale ${owner}`
      : `ha cambiato l'indirizzo di consegna predefinito ${owner}`;
  }
  return `ha modificato ${what} ${owner}`;
}

const describers: Record<string, (entry: AuditEntry, names: AuditNames) => string> = {
  customers: describeCustomer,
  customer_contacts: (entry, names) => describeDetail(entry, names, "contact"),
  customer_delivery_addresses: (entry, names) => describeDetail(entry, names, "address"),
  companies: describeCompany,
  company_bank_accounts: describeBankAccount,
  brands: describeBrand,
  company_brands: describeLink,
  profiles: describeProfile,
  profile_companies: describeProfileCompany,
};

export function describeEntry(entry: AuditEntry, names: AuditNames): AuditLine {
  const actor = entry.actorId === null ? maintenanceActor : personName(names, entry.actorId);
  const describe = describers[entry.table];
  const sentence = describe ? describe(entry, names) : "ha modificato un dato";
  return { actor, sentence: sentence.replace(/\s+/g, " "), changes: visibleChanges(entry) };
}
