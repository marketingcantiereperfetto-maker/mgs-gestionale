import { admin } from "./temporary-users";

// Dati inventati dei test: i nomi iniziano sempre con questo prefisso, così la pulizia
// tocca solo quelli (e solo sul progetto di prova, controllato da admin()).
export const testPrefix = "Prova e2e";

async function deleteLogos(folder: "brands" | "companies", ids: string[]): Promise<void> {
  const storage = admin().storage.from("logos");
  for (const id of ids) {
    const { data } = await storage.list(`${folder}/${id}`);
    const paths = (data ?? []).map((file) => `${folder}/${id}/${file.name}`);
    if (paths.length > 0) await storage.remove(paths);
  }
}

export async function deleteTestBrands(): Promise<void> {
  const supabase = admin();
  const { data, error } = await supabase.from("brands").select("id").like("name", `${testPrefix}%`);
  if (error) throw new Error(`Brand di prova non letti: ${error.message}`);
  const ids = data.map((brand) => brand.id);
  if (ids.length === 0) return;
  await supabase.from("company_brands").delete().in("brand_id", ids);
  await deleteLogos("brands", ids);
  const brands = await supabase.from("brands").delete().in("id", ids);
  if (brands.error) throw new Error(`Brand di prova non cancellati: ${brands.error.message}`);
}

export async function deleteTestCompanies(): Promise<void> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .like("legal_name", `${testPrefix}%`);
  if (error) throw new Error(`Società di prova non lette: ${error.message}`);
  const ids = data.map((company) => company.id);
  if (ids.length === 0) return;
  await supabase.from("company_brands").delete().in("company_id", ids);
  await deleteLogos("companies", ids);
  const accounts = await supabase.from("company_bank_accounts").delete().in("company_id", ids);
  if (accounts.error) throw new Error(`Conti di prova non cancellati: ${accounts.error.message}`);
  const companies = await supabase.from("companies").delete().in("id", ids);
  if (companies.error)
    throw new Error(`Società di prova non cancellate: ${companies.error.message}`);
}
