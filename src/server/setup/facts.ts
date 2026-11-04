import type { SupabaseClient } from "@supabase/supabase-js";
import { companyReadiness } from "@/domain/company/company";
import { sampleSize, type SetupFacts } from "@/domain/setup/steps";
import type { Database } from "@/lib/supabase/database.types";

// Dati del percorso guidato: solo conteggi e i primi nomi (al massimo 5), mai tutti i record.
// Contano solo società e brand attivi.

const missingData = [
  "vat_number",
  "tax_code",
  "email",
  "address_street",
  "address_postal_code",
  "address_city",
  "address_province",
  "address_country",
]
  .map((column) => `${column}.is.null`)
  .join(",");

function fail(what: string): never {
  throw new Error(`Percorso guidato: ${what} non letti`);
}

export async function loadSetupFacts(supabase: SupabaseClient<Database>): Promise<SetupFacts> {
  const [companies, incomplete, withoutAccount, brands, linked, unlinked, withoutBrand] =
    await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("companies")
        .select(
          "id, legal_name, vat_number, tax_code, email, address_street, address_postal_code, address_city, address_province, address_country",
          { count: "exact" },
        )
        .eq("is_active", true)
        .or(missingData)
        .order("legal_name")
        .limit(sampleSize),
      // Società attive senza nessun conto attivo.
      supabase
        .from("companies")
        .select("id, legal_name, company_bank_accounts!left(id)", { count: "exact" })
        .eq("is_active", true)
        .eq("company_bank_accounts.is_active", true)
        .is("company_bank_accounts", null)
        .order("legal_name")
        .limit(sampleSize),
      supabase.from("brands").select("id", { count: "exact", head: true }).eq("is_active", true),
      // Collegamenti tra un brand attivo e una società attiva.
      supabase
        .from("company_brands")
        .select("brand_id, brands!inner(is_active), companies!inner(is_active)", {
          count: "exact",
          head: true,
        })
        .eq("brands.is_active", true)
        .eq("companies.is_active", true),
      // Un brand attivo senza collegamenti, per il pulsante «Collega».
      supabase
        .from("brands")
        .select("id, name, company_brands!left(company_id)")
        .eq("is_active", true)
        .is("company_brands", null)
        .order("name")
        .limit(1),
      // Società attive senza nessun brand collegato (solo informazione).
      supabase
        .from("companies")
        .select("id, legal_name, company_brands!left(brand_id)", { count: "exact" })
        .eq("is_active", true)
        .is("company_brands", null)
        .order("legal_name")
        .limit(sampleSize),
    ]);

  if (companies.error || incomplete.error || withoutAccount.error) fail("società");
  if (brands.error || linked.error || unlinked.error || withoutBrand.error) fail("brand");

  return {
    activeCompanies: companies.count ?? 0,
    incomplete: {
      total: incomplete.count ?? 0,
      sample: incomplete.data.map((row) => ({
        id: row.id,
        name: row.legal_name,
        missing: companyReadiness(
          {
            legalName: row.legal_name,
            vatNumber: row.vat_number,
            taxCode: row.tax_code,
            email: row.email,
            addressStreet: row.address_street,
            addressPostalCode: row.address_postal_code,
            addressCity: row.address_city,
            addressProvince: row.address_province,
            addressCountry: row.address_country,
          },
          true,
        ).missing,
      })),
    },
    withoutAccount: {
      total: withoutAccount.count ?? 0,
      sample: withoutAccount.data.map((row) => ({ id: row.id, name: row.legal_name })),
    },
    activeBrands: brands.count ?? 0,
    linkedBrands: linked.count ?? 0,
    unlinkedBrand: unlinked.data[0]
      ? { id: unlinked.data[0].id, name: unlinked.data[0].name }
      : null,
    withoutBrand: {
      total: withoutBrand.count ?? 0,
      sample: withoutBrand.data.map((row) => ({ id: row.id, name: row.legal_name })),
    },
  };
}
