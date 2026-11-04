"use server";

import { revalidatePath } from "next/cache";
import type { FieldErrors } from "@/domain/company/company";
import {
  parseCustomer,
  type CustomerData,
  type CustomerField,
  type CustomerInput,
} from "@/domain/customers/customer";
import { decideDuplicates, type DuplicateCandidate } from "@/domain/customers/duplicates";
import { customerPath, customersPath } from "@/lib/customer-paths";
import {
  creationKey,
  databaseMessage,
  field,
  isDuplicate,
  succeeded,
  uuidPattern,
  type Result,
} from "@/server/action-helpers";
import { getCurrentUser } from "@/server/auth/current-user";
import { can, type Action } from "@/server/auth/permissions";
import { createSupabaseServerClient } from "@/server/supabase";
import { toCustomerColumns } from "./queries";

export type CreatedCustomer = { id: string; name: string };

export type CustomerFormState = Result & {
  fieldErrors: FieldErrors<CustomerField | "groupCompanyId">;
  values?: CustomerInput & { groupCompanyId?: string };
  // Partita IVA o codice fiscale già di un altro cliente: serve la casella «È un cliente diverso».
  needsConfirmation?: boolean;
  // Il cliente appena creato, per il chiamante della maschera (Clienti, domani il preventivo).
  created?: CreatedCustomer;
};

const customerFields: CustomerField[] = [
  "name",
  "subjectType",
  "vatNumber",
  "taxCode",
  "foreignTaxId",
  "addressStreet",
  "addressPostalCode",
  "addressCity",
  "addressProvince",
  "addressCountry",
  "sdiCode",
  "pec",
  "paOfficeCode",
  "paOfficeName",
  "splitPayment",
  "vatRegime",
  "vatExemptionNature",
  "intentDeclarationNumber",
  "intentDeclarationDate",
];

const messages: Partial<Record<Action, string>> = {
  "customers.edit": "Non puoi modificare i clienti.",
  "customers.deactivate": "Solo titolare e responsabile commerciale disattivano i clienti.",
  "customers.group_company":
    "Solo titolare e amministrazione economica indicano la società del gruppo.",
};

const officeDuplicate =
  "Esiste già un cliente con questa partita IVA o questo codice fiscale e lo stesso codice ufficio. Non si può salvare un doppione.";

function read(formData: FormData): CustomerInput {
  return Object.fromEntries(customerFields.map((name) => [name, field(formData, name)]));
}

// Errori del database, con i messaggi dei clienti; mai codici nei messaggi.
function customerDatabaseMessage(error: { code?: string; message: string }): string {
  if (
    isDuplicate(error, "customers_vat_office_key") ||
    isDuplicate(error, "customers_tax_office_key")
  ) {
    return officeDuplicate;
  }
  if (error.code === "42501" && error.message.includes("società del gruppo")) {
    return messages["customers.group_company"]!;
  }
  if (error.code === "42501" && error.message.includes("disattivano")) {
    return messages["customers.deactivate"]!;
  }
  if (error.code === "42501") return messages["customers.edit"]!;
  return databaseMessage(error);
}

// Altri clienti con la stessa partita IVA o lo stesso codice fiscale. I codici restano qui sul
// server: al modulo arrivano solo nome e comune, dentro il messaggio.
async function duplicateCandidates(
  customer: CustomerData,
  excludeId: string | null,
): Promise<DuplicateCandidate[]> {
  const conditions = [
    customer.vatNumber ? `vat_number.eq.${customer.vatNumber}` : null,
    customer.taxCode ? `tax_code.eq.${customer.taxCode}` : null,
  ].filter((condition): condition is string => condition !== null);
  if (conditions.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("customers")
    .select("name, address_city, vat_number, tax_code, pa_office_code")
    .or(conditions.join(","))
    .limit(5);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error("Controllo dei doppioni non riuscito");

  return data.map((row) => ({
    name: row.name,
    city: row.address_city,
    sameVatNumber: customer.vatNumber !== null && row.vat_number === customer.vatNumber,
    sameTaxCode: customer.taxCode !== null && row.tax_code === customer.taxCode,
    sameOfficeCode: customer.paOfficeCode !== null && row.pa_office_code === customer.paOfficeCode,
  }));
}

type Checked = { ok: true; customer: CustomerData } | { ok: false; state: CustomerFormState };

// Lettura, validazione e doppioni: uguali per la maschera e per la scheda.
async function checkCustomer(formData: FormData, excludeId: string | null): Promise<Checked> {
  const values = { ...read(formData), groupCompanyId: field(formData, "groupCompanyId") };
  const parsed = parseCustomer(values);
  if (!parsed.ok) return { ok: false, state: { error: null, fieldErrors: parsed.errors, values } };

  const decision = decideDuplicates(
    await duplicateCandidates(parsed.value, excludeId),
    formData.get("confirmDifferent") === "on",
  );
  if (decision.kind === "block") {
    return { ok: false, state: { error: decision.message, fieldErrors: {}, values } };
  }
  if (decision.kind === "confirm") {
    return {
      ok: false,
      state: { error: decision.message, fieldErrors: {}, values, needsConfirmation: true },
    };
  }
  return { ok: true, customer: parsed.value };
}

export async function createCustomer(
  state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!can(user, "customers.edit")) return { error: messages["customers.edit"]!, fieldErrors: {} };
  const checked = await checkCustomer(formData, null);
  if (!checked.ok) return checked.state;

  const key = creationKey(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...toCustomerColumns(checked.customer), creation_key: key })
    .select("id, name")
    .single();

  let created = data ?? undefined;
  if (error && key && isDuplicate(error, "customers_creation_key_key")) {
    // Secondo invio dello stesso modulo: il cliente esiste già, si restituisce quello.
    const existing = await supabase
      .from("customers")
      .select("id, name")
      .eq("creation_key", key)
      .single();
    created = existing.data ?? undefined;
  } else if (error) {
    return { error: customerDatabaseMessage(error), fieldErrors: {}, values: read(formData) };
  }
  if (!created) return { error: "Salvataggio non riuscito. Riprova.", fieldErrors: {} };
  revalidatePath(customersPath);
  return { ...succeeded(state, "Cliente creato."), fieldErrors: {}, created };
}

export async function updateCustomer(
  state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!can(user, "customers.edit")) return { error: messages["customers.edit"]!, fieldErrors: {} };
  const id = field(formData, "id");
  const checked = await checkCustomer(formData, id);
  if (!checked.ok) return checked.state;

  const columns: ReturnType<typeof toCustomerColumns> & { group_company_id?: string | null } =
    toCustomerColumns(checked.customer);
  // La società del gruppo si invia solo se chi salva può cambiarla.
  if (can(user, "customers.group_company") && formData.has("groupCompanyId")) {
    const group = field(formData, "groupCompanyId");
    if (group && !uuidPattern.test(group)) {
      return { error: null, fieldErrors: { groupCompanyId: "Società non valida." } };
    }
    columns.group_company_id = group || null;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update(columns).eq("id", id);
  if (error) {
    return { error: customerDatabaseMessage(error), fieldErrors: {}, values: read(formData) };
  }
  revalidatePath(customersPath);
  revalidatePath(customerPath(id));
  return { ...succeeded(state, "Cliente salvato."), fieldErrors: {} };
}

export async function setCustomerActive(state: Result, formData: FormData): Promise<Result> {
  if (!can(await getCurrentUser(), "customers.deactivate")) {
    return { error: messages["customers.deactivate"]! };
  }
  const id = field(formData, "id");
  const active = field(formData, "active") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update({ is_active: active }).eq("id", id);
  if (error) return { error: customerDatabaseMessage(error) };
  revalidatePath(customersPath);
  revalidatePath(customerPath(id));
  return succeeded(state, active ? "Cliente riattivato." : "Cliente disattivato.");
}

export type SimilarCustomer = {
  id: string;
  name: string;
  city: string | null;
  reason: string;
  isActive: boolean;
};

const reasonLabels: Record<string, string> = {
  vat_number: "stessa partita IVA",
  tax_code: "stesso codice fiscale",
  name: "nome simile",
};

// Clienti simili mentre si scrive: solo nome, comune, motivo e stato (mai i codici).
export async function findSimilarCustomers(input: {
  name: string;
  vatNumber: string;
  taxCode: string;
  excludeId?: string;
}): Promise<{ results: SimilarCustomer[]; error: string | null }> {
  if (!can(await getCurrentUser(), "customers.view")) return { results: [], error: null };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("similar_customers", {
    search_name: input.name.slice(0, 100),
    search_vat_number: input.vatNumber.slice(0, 100),
    search_tax_code: input.taxCode.slice(0, 100),
    ...(input.excludeId && uuidPattern.test(input.excludeId)
      ? { exclude_id: input.excludeId }
      : {}),
  });
  if (error) {
    return {
      results: [],
      error:
        error.code === "P0001"
          ? "Troppe ricerche ravvicinate, riprova tra un minuto."
          : "Ricerca dei clienti simili non riuscita.",
    };
  }
  return {
    results: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      reason: reasonLabels[row.reason] ?? row.reason,
      isActive: row.is_active,
    })),
    error: null,
  };
}
