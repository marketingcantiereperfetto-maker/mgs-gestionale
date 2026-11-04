import { admin } from "./temporary-users";

// Dati inventati dei test: i nomi iniziano sempre con questo prefisso, così la pulizia
// tocca solo quelli (e solo sul progetto di prova, controllato da admin()).
export const testPrefix = "Prova e2e";

// Ogni file di prova usa un prefisso suo e pulisce solo i suoi dati: le prove girano in
// parallelo. I resti di prove interrotte si cancellano solo dopo un'ora.
export function runPrefix(run: string): string {
  return `${testPrefix} ${run}`;
}

export type Cleanup = { prefix: string } | { leftoversOlderThanHour: true };

type Filterable<Query> = {
  like(column: string, pattern: string): Query;
  lt(column: string, value: string): Query;
};

function scope<Query extends Filterable<Query>>(
  query: Query,
  column: string,
  cleanup: Cleanup,
): Query {
  if ("prefix" in cleanup) return query.like(column, `${cleanup.prefix}%`);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return query.like(column, `${testPrefix}%`).lt("created_at", hourAgo);
}

async function deleteLogos(folder: "brands" | "companies", ids: string[]): Promise<void> {
  const storage = admin().storage.from("logos");
  for (const id of ids) {
    const { data } = await storage.list(`${folder}/${id}`);
    const paths = (data ?? []).map((file) => `${folder}/${id}/${file.name}`);
    if (paths.length > 0) await storage.remove(paths);
  }
}

export async function deleteTestBrands(cleanup: Cleanup): Promise<void> {
  const supabase = admin();
  const { data, error } = await scope(supabase.from("brands").select("id"), "name", cleanup);
  if (error) throw new Error(`Brand di prova non letti: ${error.message}`);
  const ids = data.map((brand) => brand.id);
  if (ids.length === 0) return;
  await supabase.from("company_brands").delete().in("brand_id", ids);
  await deleteLogos("brands", ids);
  const brands = await supabase.from("brands").delete().in("id", ids);
  if (brands.error) throw new Error(`Brand di prova non cancellati: ${brands.error.message}`);
}

export async function deleteTestCompanies(cleanup: Cleanup): Promise<void> {
  const supabase = admin();
  const { data, error } = await scope(
    supabase.from("companies").select("id"),
    "legal_name",
    cleanup,
  );
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

export async function deleteTestCustomers(cleanup: Cleanup): Promise<void> {
  const supabase = admin();
  const { data, error } = await scope(supabase.from("customers").select("id"), "name", cleanup);
  if (error) throw new Error(`Clienti di prova non letti: ${error.message}`);
  const ids = data.map((customer) => customer.id);
  if (ids.length === 0) return;
  const customers = await supabase.from("customers").delete().in("id", ids);
  if (customers.error)
    throw new Error(`Clienti di prova non cancellati: ${customers.error.message}`);
}
