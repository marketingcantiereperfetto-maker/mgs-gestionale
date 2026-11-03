"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  companyFields,
  parseBankAccount,
  parseCompany,
  type BankAccountField,
  type CompanyField,
  type FieldErrors,
} from "@/domain/company/company";
import { companiesPath, companyPath } from "@/lib/company-paths";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/auth/permissions";
import { createSupabaseServerClient } from "@/server/supabase";
import { toCompanyColumns } from "./queries";

// Esito di ogni azione: errore oppure conferma breve; i valori inviati tornano indietro, così
// dopo un errore il modulo li mostra ancora. «done» conta le operazioni riuscite.
type Result = { error: string | null; message?: string | null; done?: number };

export type CompanyFormState = Result & {
  fieldErrors: FieldErrors<CompanyField>;
  values?: Partial<Record<CompanyField, string>>;
};
export type BankAccountFormState = Result & {
  fieldErrors: FieldErrors<BankAccountField>;
  values?: Partial<Record<BankAccountField, string>>;
};
export type ActionState = Result;

const notAllowed = "Solo il titolare può gestire società e conti.";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Chiave di creazione generata dal modulo: lo stesso invio ripetuto non crea due record.
function creationKey(formData: FormData): string | null {
  const key = field(formData, "creationKey");
  return uuidPattern.test(key) ? key : null;
}

async function allowed(): Promise<boolean> {
  return can(await getCurrentUser(), "companies.manage");
}

type DatabaseError = { code?: string; message: string };

const isDuplicate = (error: DatabaseError, constraint: string) =>
  error.code === "23505" && error.message.includes(constraint);

// Errori del database tradotti: le regole sono anche lì, come seconda difesa.
function databaseMessage(error: DatabaseError): string {
  if (error.code === "42501") return notAllowed;
  if (error.code === "P0001") return `${error.message}.`;
  if (isDuplicate(error, "company_bank_accounts_company_iban_key")) {
    return "Questo conto è già presente.";
  }
  if (error.code === "23514") return "Un dato non rispetta il formato richiesto.";
  return "Salvataggio non riuscito. Riprova.";
}

function succeeded<State extends Result>(state: State, message: string): Result {
  return { error: null, message, done: (state.done ?? 0) + 1 };
}

export async function createCompany(
  _state: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const values = { legalName: field(formData, "legalName") };
  const parsed = parseCompany(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const key = creationKey(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...toCompanyColumns(parsed.value), creation_key: key })
    .select("id")
    .single();

  let id = data?.id;
  if (error && key && isDuplicate(error, "companies_creation_key_key")) {
    // Secondo invio dello stesso modulo: la società esiste già, si apre quella.
    const existing = await supabase.from("companies").select("id").eq("creation_key", key).single();
    id = existing.data?.id;
  } else if (error) {
    return { error: databaseMessage(error), fieldErrors: {}, values };
  }
  if (!id) return { error: "Salvataggio non riuscito. Riprova.", fieldErrors: {}, values };
  revalidatePath(companiesPath);
  redirect(`${companyPath(id)}?esito=creata`);
}

export async function updateCompany(
  state: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const id = field(formData, "id");
  const values = Object.fromEntries(companyFields.map((name) => [name, field(formData, name)]));
  const parsed = parseCompany(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("companies")
    .update(toCompanyColumns(parsed.value))
    .eq("id", id);
  if (error) return { error: databaseMessage(error), fieldErrors: {}, values };
  revalidatePath(companyPath(id));
  return { ...succeeded(state, "Società salvata."), fieldErrors: {} };
}

export async function setCompanyActive(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const id = field(formData, "id");
  const active = field(formData, "active") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("companies").update({ is_active: active }).eq("id", id);
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companiesPath);
  revalidatePath(companyPath(id));
  return succeeded(state, active ? "Società riattivata." : "Società disattivata.");
}

export async function addBankAccount(
  state: BankAccountFormState,
  formData: FormData,
): Promise<BankAccountFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const companyId = field(formData, "companyId");
  const values = { label: field(formData, "label"), iban: field(formData, "iban") };
  const parsed = parseBankAccount(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const key = creationKey(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("company_bank_accounts").insert({
    company_id: companyId,
    label: parsed.value.label,
    iban: parsed.value.iban,
    creation_key: key,
  });
  if (error) {
    // Secondo invio dello stesso modulo: il conto è già stato aggiunto dal primo.
    const sameSubmission =
      error.code === "23505" &&
      key !== null &&
      (await supabase.from("company_bank_accounts").select("id").eq("creation_key", key)).data
        ?.length === 1;
    if (!sameSubmission) {
      return { error: databaseMessage(error), fieldErrors: {}, values };
    }
  }
  revalidatePath(companyPath(companyId));
  return { ...succeeded(state, "Conto aggiunto."), fieldErrors: {} };
}

export async function setDefaultBankAccount(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_default_bank_account", {
    account_id: field(formData, "accountId"),
  });
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companyPath(field(formData, "companyId")));
  return succeeded(state, "Conto predefinito aggiornato.");
}

export async function setBankAccountActive(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const active = field(formData, "active") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_bank_account_active", {
    account_id: field(formData, "accountId"),
    active,
  });
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companyPath(field(formData, "companyId")));
  return succeeded(state, active ? "Conto riattivato." : "Conto disattivato.");
}
