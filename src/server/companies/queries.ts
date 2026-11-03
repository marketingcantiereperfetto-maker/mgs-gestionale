import type { CompanyData } from "@/domain/company/company";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/server/supabase";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type BankAccountRow = Database["public"]["Tables"]["company_bank_accounts"]["Row"];

export type BankAccount = {
  id: string;
  label: string | null;
  iban: string;
  isDefault: boolean;
  isActive: boolean;
};

export type Company = CompanyData & {
  id: string;
  isActive: boolean;
  bankAccounts: BankAccount[];
};

function toBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    label: row.label,
    iban: row.iban,
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}

function toCompany(row: CompanyRow & { company_bank_accounts: BankAccountRow[] }): Company {
  return {
    id: row.id,
    legalName: row.legal_name,
    vatNumber: row.vat_number,
    taxCode: row.tax_code,
    email: row.email,
    addressStreet: row.address_street,
    addressPostalCode: row.address_postal_code,
    addressCity: row.address_city,
    addressProvince: row.address_province,
    addressCountry: row.address_country,
    isActive: row.is_active,
    bankAccounts: row.company_bank_accounts
      .map(toBankAccount)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
  };
}

export async function listCompanies(): Promise<Company[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, company_bank_accounts(*)")
    .order("legal_name");
  if (error) throw new Error(`Società non lette: ${error.message}`);
  return data.map(toCompany);
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, company_bank_accounts(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Società non letta: ${error.message}`);
  return data ? toCompany(data) : null;
}

// Per i database: i nomi delle colonne dei dati della società.
export function toCompanyColumns(company: CompanyData) {
  return {
    legal_name: company.legalName,
    vat_number: company.vatNumber,
    tax_code: company.taxCode,
    email: company.email,
    address_street: company.addressStreet,
    address_postal_code: company.addressPostalCode,
    address_city: company.addressCity,
    address_province: company.addressProvince,
    address_country: company.addressCountry,
  };
}
