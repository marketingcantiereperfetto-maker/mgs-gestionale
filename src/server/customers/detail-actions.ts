"use server";

import { revalidatePath } from "next/cache";
import type { FieldErrors } from "@/domain/company/company";
import {
  parseAddress,
  parseContact,
  type AddressField,
  type AddressInput,
  type ContactField,
  type ContactInput,
} from "@/domain/customers/details";
import { customerPath } from "@/lib/customer-paths";
import {
  creationKey,
  field,
  isDuplicate,
  succeeded,
  uuidPattern,
  type DatabaseError,
  type Result,
} from "@/server/action-helpers";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/permissions";
import { createSupabaseServerClient } from "@/server/supabase";

// Referenti e indirizzi di consegna del cliente (decisioni del 4 novembre 2026). Li aggiunge e
// modifica chi modifica i clienti, che sceglie anche principale e predefinito; disattivano e
// riattivano solo titolare e responsabile commerciale. Le stesse regole sono nel database.

export type ContactFormState = Result & {
  fieldErrors: FieldErrors<ContactField>;
  values?: ContactInput;
};
export type AddressFormState = Result & {
  fieldErrors: FieldErrors<AddressField>;
  values?: AddressInput;
};

const notAllowedEdit = "Non puoi modificare i clienti.";
const notAllowedDeactivate = "Solo titolare e responsabile commerciale possono disattivare.";

function detailMessage(error: DatabaseError): string {
  if (error.code === "42501") return notAllowedEdit;
  if (error.code === "P0001") return `${error.message}.`;
  if (error.code === "23514") return "Un dato non rispetta il formato richiesto.";
  return "Salvataggio non riuscito. Riprova.";
}

function ids(formData: FormData, name: string): { customerId: string; id: string } | null {
  const customerId = field(formData, "customerId");
  const id = field(formData, name);
  if (!uuidPattern.test(customerId) || (id && !uuidPattern.test(id))) return null;
  return { customerId, id };
}

const contactFields: ContactField[] = ["name", "role", "email", "phone"];
const addressFields: AddressField[] = [
  "description",
  "street",
  "postalCode",
  "city",
  "province",
  "country",
];

function read<Name extends string>(formData: FormData, names: Name[]): Record<Name, string> {
  return Object.fromEntries(names.map((name) => [name, field(formData, name)])) as Record<
    Name,
    string
  >;
}

// Inserimento protetto dal doppio invio: un secondo invio con la stessa chiave non crea nulla.
async function insertOnce(
  table: "customer_contacts" | "customer_delivery_addresses",
  row: Record<string, unknown>,
  key: string | null,
): Promise<DatabaseError | null> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).insert({ ...row, creation_key: key } as never);
  if (error && key && isDuplicate(error, `${table}_creation_key_key`)) return null;
  return error;
}

export async function saveContact(
  state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  if (!can(await getCurrentUser(), "customers.edit")) {
    return { error: notAllowedEdit, fieldErrors: {} };
  }
  const target = ids(formData, "contactId");
  if (!target) return { error: "Referente non valido.", fieldErrors: {} };
  const values = read(formData, contactFields);
  const parsed = parseContact(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const columns = parsed.value;
  let error: DatabaseError | null;
  if (target.id) {
    const supabase = await createSupabaseServerClient();
    ({ error } = await supabase.from("customer_contacts").update(columns).eq("id", target.id));
  } else {
    error = await insertOnce(
      "customer_contacts",
      { ...columns, customer_id: target.customerId },
      creationKey(formData),
    );
  }
  if (error) return { error: detailMessage(error), fieldErrors: {}, values };
  revalidatePath(customerPath(target.customerId));
  return {
    ...succeeded(state, target.id ? "Referente salvato." : "Referente aggiunto."),
    fieldErrors: {},
  };
}

export async function saveAddress(
  state: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  if (!can(await getCurrentUser(), "customers.edit")) {
    return { error: notAllowedEdit, fieldErrors: {} };
  }
  const target = ids(formData, "addressId");
  if (!target) return { error: "Indirizzo non valido.", fieldErrors: {} };
  const values = read(formData, addressFields);
  const parsed = parseAddress(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const columns = {
    description: parsed.value.description,
    street: parsed.value.street,
    postal_code: parsed.value.postalCode,
    city: parsed.value.city,
    province: parsed.value.province,
    country: parsed.value.country,
  };
  let error: DatabaseError | null;
  if (target.id) {
    const supabase = await createSupabaseServerClient();
    ({ error } = await supabase
      .from("customer_delivery_addresses")
      .update(columns)
      .eq("id", target.id));
  } else {
    error = await insertOnce(
      "customer_delivery_addresses",
      { ...columns, customer_id: target.customerId },
      creationKey(formData),
    );
  }
  if (error) return { error: detailMessage(error), fieldErrors: {}, values };
  revalidatePath(customerPath(target.customerId));
  return {
    ...succeeded(state, target.id ? "Indirizzo salvato." : "Indirizzo aggiunto."),
    fieldErrors: {},
  };
}

type Rpc =
  | { name: "set_primary_customer_contact"; args: { contact_id: string } }
  | { name: "set_customer_contact_active"; args: { contact_id: string; active: boolean } }
  | { name: "set_default_customer_address"; args: { address_id: string } }
  | { name: "set_customer_address_active"; args: { address_id: string; active: boolean } };

async function callRpc(call: Rpc): Promise<DatabaseError | null> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(call.name, call.args as never);
  return error;
}

async function runChange(
  state: Result,
  formData: FormData,
  idName: "contactId" | "addressId",
  action: "customers.edit" | "customers.deactivate",
  build: (id: string, active: boolean) => Rpc,
  message: (active: boolean) => string,
): Promise<Result> {
  if (!can(await getCurrentUser(), action)) {
    return { error: action === "customers.edit" ? notAllowedEdit : notAllowedDeactivate };
  }
  const target = ids(formData, idName);
  if (!target?.id) return { error: "Operazione non valida." };
  const active = field(formData, "active") === "true";
  const error = await callRpc(build(target.id, active));
  if (error) {
    return {
      error:
        error.code === "42501" && action === "customers.deactivate"
          ? notAllowedDeactivate
          : detailMessage(error),
    };
  }
  revalidatePath(customerPath(target.customerId));
  return succeeded(state, message(active));
}

export async function setPrimaryContact(state: Result, formData: FormData): Promise<Result> {
  return runChange(
    state,
    formData,
    "contactId",
    "customers.edit",
    (id) => ({ name: "set_primary_customer_contact", args: { contact_id: id } }),
    () => "Referente principale aggiornato.",
  );
}

export async function setContactActive(state: Result, formData: FormData): Promise<Result> {
  return runChange(
    state,
    formData,
    "contactId",
    "customers.deactivate",
    (id, active) => ({ name: "set_customer_contact_active", args: { contact_id: id, active } }),
    (active) => (active ? "Referente riattivato." : "Referente disattivato."),
  );
}

export async function setDefaultAddress(state: Result, formData: FormData): Promise<Result> {
  return runChange(
    state,
    formData,
    "addressId",
    "customers.edit",
    (id) => ({ name: "set_default_customer_address", args: { address_id: id } }),
    () => "Indirizzo predefinito aggiornato.",
  );
}

export async function setAddressActive(state: Result, formData: FormData): Promise<Result> {
  return runChange(
    state,
    formData,
    "addressId",
    "customers.deactivate",
    (id, active) => ({ name: "set_customer_address_active", args: { address_id: id, active } }),
    (active) => (active ? "Indirizzo riattivato." : "Indirizzo disattivato."),
  );
}
