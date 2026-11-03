"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseBrandName } from "@/domain/company/brand";
import type { FieldErrors } from "@/domain/company/company";
import { brandPath, companiesPath, companyPath } from "@/lib/company-paths";
import {
  canManageCompanies as allowed,
  creationKey,
  databaseMessage,
  field,
  isDuplicate,
  notAllowed,
  succeeded,
  uuidPattern,
  type Result,
} from "@/server/action-helpers";
import { createSupabaseServerClient } from "@/server/supabase";

export type BrandFormState = Result & {
  fieldErrors: FieldErrors<"name">;
  values?: { name: string };
};
export type BrandActionState = Result & { warning?: string | null };

export async function createBrand(
  _state: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const values = { name: field(formData, "name") };
  const parsed = parseBrandName(values.name);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const key = creationKey(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: parsed.value.name, creation_key: key })
    .select("id")
    .single();

  let id = data?.id;
  if (error && key && isDuplicate(error, "brands_creation_key_key")) {
    // Secondo invio dello stesso modulo: il brand esiste già, si apre quello.
    const existing = await supabase.from("brands").select("id").eq("creation_key", key).single();
    id = existing.data?.id;
  } else if (error) {
    return { error: databaseMessage(error), fieldErrors: {}, values };
  }
  if (!id) return { error: "Salvataggio non riuscito. Riprova.", fieldErrors: {}, values };
  revalidatePath(companiesPath);
  redirect(`${brandPath(id)}?esito=creato`);
}

export async function renameBrand(
  state: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  if (!(await allowed())) return { error: notAllowed, fieldErrors: {} };
  const id = field(formData, "id");
  const values = { name: field(formData, "name") };
  const parsed = parseBrandName(values.name);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors, values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("brands").update({ name: parsed.value.name }).eq("id", id);
  if (error) return { error: databaseMessage(error), fieldErrors: {}, values };
  revalidatePath(companiesPath);
  revalidatePath(brandPath(id));
  return { ...succeeded(state, "Brand salvato."), fieldErrors: {} };
}

export async function setBrandActive(state: Result, formData: FormData): Promise<Result> {
  if (!(await allowed())) return { error: notAllowed };
  const id = field(formData, "id");
  const active = field(formData, "active") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("brands").update({ is_active: active }).eq("id", id);
  if (error) return { error: databaseMessage(error) };
  revalidatePath(companiesPath);
  revalidatePath(brandPath(id));
  return succeeded(state, active ? "Brand riattivato." : "Brand disattivato.");
}

// Società collegate al brand: si aggiungono le spuntate e si tolgono le altre (il registro
// conserva ogni collegamento tolto). Un brand senza società è ammesso, con un avviso.
export async function setBrandCompanies(
  state: BrandActionState,
  formData: FormData,
): Promise<BrandActionState> {
  if (!(await allowed())) return { error: notAllowed };
  const brandId = field(formData, "brandId");
  const chosen = formData
    .getAll("companyIds")
    .filter((value): value is string => typeof value === "string" && uuidPattern.test(value));

  const supabase = await createSupabaseServerClient();
  const current = await supabase
    .from("company_brands")
    .select("company_id")
    .eq("brand_id", brandId);
  if (current.error) return { error: databaseMessage(current.error) };
  const linked = current.data.map((link) => link.company_id);
  const toAdd = chosen.filter((id) => !linked.includes(id));
  const toRemove = linked.filter((id) => !chosen.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("company_brands")
      .insert(toAdd.map((companyId) => ({ company_id: companyId, brand_id: brandId })));
    if (error && error.code !== "23505") return { error: databaseMessage(error) };
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("company_brands")
      .delete()
      .eq("brand_id", brandId)
      .in("company_id", toRemove);
    if (error) return { error: databaseMessage(error) };
  }

  revalidatePath(brandPath(brandId));
  for (const companyId of [...toAdd, ...toRemove]) revalidatePath(companyPath(companyId));
  return {
    ...succeeded(state, "Collegamenti salvati."),
    warning: chosen.length === 0 ? "Il brand ora non è collegato a nessuna società." : null,
  };
}
