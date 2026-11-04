"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FieldErrors } from "@/domain/company/company";
import { parseCustomer, type CustomerField, type CustomerInput } from "@/domain/customers/customer";
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

export type CustomerFormState = Result & {
  fieldErrors: FieldErrors<CustomerField | "groupCompanyId">;
  values?: CustomerInput & { groupCompanyId?: string };
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

async function allowed(action: Action): Promise<boolean> {
  return can(await getCurrentUser(), action);
}

function read(formData: FormData): CustomerInput {
  return Object.fromEntries(customerFields.map((name) => [name, field(formData, name)]));
}

// Errori del database, con i messaggi dei clienti per le facoltà ristrette.
function customerDatabaseMessage(error: { code?: string; message: string }): string {
  if (error.code === "42501" && error.message.includes("società del gruppo")) {
    return messages["customers.group_company"]!;
  }
  if (error.code === "42501" && error.message.includes("disattivano")) {
    return messages["customers.deactivate"]!;
  }
  if (error.code === "42501") return messages["customers.edit"]!;
  return databaseMessage(error);
}

export async function createCustomer(
  _state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  if (!(await allowed("customers.edit"))) {
    return { error: messages["customers.edit"]!, fieldErrors: {} };
  }
  const values = { name: field(formData, "name"), subjectType: field(formData, "subjectType") };
  const parsed = parseCustomer(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const key = creationKey(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: parsed.value.name, subject_type: parsed.value.subjectType, creation_key: key })
    .select("id")
    .single();

  let id = data?.id;
  if (error && key && isDuplicate(error, "customers_creation_key_key")) {
    // Secondo invio dello stesso modulo: il cliente esiste già, si apre quello.
    const existing = await supabase.from("customers").select("id").eq("creation_key", key).single();
    id = existing.data?.id;
  } else if (error) {
    return { error: customerDatabaseMessage(error), fieldErrors: {}, values };
  }
  if (!id) return { error: "Salvataggio non riuscito. Riprova.", fieldErrors: {}, values };
  revalidatePath(customersPath);
  redirect(`${customerPath(id)}?esito=creato`);
}

export async function updateCustomer(
  state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!can(user, "customers.edit")) return { error: messages["customers.edit"]!, fieldErrors: {} };
  const id = field(formData, "id");
  const values = { ...read(formData), groupCompanyId: field(formData, "groupCompanyId") };
  const parsed = parseCustomer(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const columns: ReturnType<typeof toCustomerColumns> & { group_company_id?: string | null } =
    toCustomerColumns(parsed.value);
  // La società del gruppo si invia solo se chi salva può cambiarla.
  if (can(user, "customers.group_company") && formData.has("groupCompanyId")) {
    const group = values.groupCompanyId;
    if (group && !uuidPattern.test(group)) {
      return { error: null, fieldErrors: { groupCompanyId: "Società non valida." }, values };
    }
    columns.group_company_id = group || null;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update(columns).eq("id", id);
  if (error) return { error: customerDatabaseMessage(error), fieldErrors: {}, values };
  revalidatePath(customersPath);
  revalidatePath(customerPath(id));
  return { ...succeeded(state, "Cliente salvato."), fieldErrors: {} };
}

export async function setCustomerActive(state: Result, formData: FormData): Promise<Result> {
  if (!(await allowed("customers.deactivate"))) {
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
