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

// I valori inviati tornano indietro: dopo un errore il modulo li mostra ancora.
export type CompanyFormState = {
  error: string | null;
  fieldErrors: FieldErrors<CompanyField>;
  values?: Partial<Record<CompanyField, string>>;
};
export type BankAccountFormState = {
  error: string | null;
  fieldErrors: FieldErrors<BankAccountField>;
  values?: Partial<Record<BankAccountField, string>>;
  saved?: number;
};

const notAllowed = "Solo il titolare può gestire società e conti.";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function allowed(): Promise<boolean> {
  return can(await getCurrentUser(), "companies.manage");
}

// Errori del database tradotti: le regole sono anche lì, come seconda difesa.
function databaseMessage(error: { code?: string; message: string }): string {
  if (error.code === "42501") return notAllowed;
  if (error.code === "P0001") return `${error.message}.`;
  if (error.code === "23514") return "Un dato non rispetta il formato richiesto.";
  return "Salvataggio non riuscito. Riprova.";
}

export async function createCompany(
  _state: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const values = { legalName: field(formData, "legalName") };
  const parsed = parseCompany(values);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .insert(toCompanyColumns(parsed.value))
    .select("id")
    .single();
  if (error) return { error: databaseMessage(error), fieldErrors: {}, values };
  revalidatePath(companiesPath);
  redirect(companyPath(data.id));
}

export async function updateCompany(
  _state: CompanyFormState,
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
  redirect(`${companyPath(id)}?salvata=1`);
}

export async function setCompanyActive(formData: FormData): Promise<void> {
  if (!(await allowed())) return;
  const id = field(formData, "id");
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("companies")
    .update({ is_active: field(formData, "active") === "true" })
    .eq("id", id);
  revalidatePath(companiesPath);
  revalidatePath(companyPath(id));
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("company_bank_accounts")
    .insert({ company_id: companyId, label: parsed.value.label, iban: parsed.value.iban });
  if (error) return { error: databaseMessage(error), fieldErrors: {}, values };
  revalidatePath(companyPath(companyId));
  return { error: null, fieldErrors: {}, saved: (state.saved ?? 0) + 1 };
}

export type AccountActionState = { error: string | null };

export async function setDefaultBankAccount(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_default_bank_account", {
    account_id: field(formData, "accountId"),
  });
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companyPath(field(formData, "companyId")));
  return { error: null };
}

export async function setBankAccountActive(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_bank_account_active", {
    account_id: field(formData, "accountId"),
    active: field(formData, "active") === "true",
  });
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companyPath(field(formData, "companyId")));
  return { error: null };
}
