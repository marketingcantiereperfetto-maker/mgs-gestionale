import type { CustomerData, SubjectType, VatRegime } from "@/domain/customers/customer";
import { customerSearchFilter } from "@/domain/customers/search";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/server/supabase";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export type Customer = CustomerData & {
  id: string;
  isActive: boolean;
  groupCompanyId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};

export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    subjectType: row.subject_type as SubjectType | null,
    vatNumber: row.vat_number,
    taxCode: row.tax_code,
    foreignTaxId: row.foreign_tax_id,
    addressStreet: row.address_street,
    addressPostalCode: row.address_postal_code,
    addressCity: row.address_city,
    addressProvince: row.address_province,
    addressCountry: row.address_country,
    sdiCode: row.sdi_code,
    pec: row.pec,
    paOfficeCode: row.pa_office_code,
    paOfficeName: row.pa_office_name,
    splitPayment: row.split_payment,
    vatRegime: row.vat_regime as VatRegime | null,
    vatExemptionNature: row.vat_exemption_nature,
    intentDeclarationNumber: row.intent_declaration_number,
    intentDeclarationDate: row.intent_declaration_date,
    isActive: row.is_active,
    groupCompanyId: row.group_company_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function toCustomerColumns(customer: CustomerData) {
  return {
    name: customer.name,
    subject_type: customer.subjectType,
    vat_number: customer.vatNumber,
    tax_code: customer.taxCode,
    foreign_tax_id: customer.foreignTaxId,
    address_street: customer.addressStreet,
    address_postal_code: customer.addressPostalCode,
    address_city: customer.addressCity,
    address_province: customer.addressProvince,
    address_country: customer.addressCountry,
    sdi_code: customer.sdiCode,
    pec: customer.pec,
    pa_office_code: customer.paOfficeCode,
    pa_office_name: customer.paOfficeName,
    split_payment: customer.splitPayment,
    vat_regime: customer.vatRegime,
    vat_exemption_nature: customer.vatExemptionNature,
    intent_declaration_number: customer.intentDeclarationNumber,
    intent_declaration_date: customer.intentDeclarationDate,
  };
}

// L'elenco legge le righe intere per calcolare la completezza, ma mostra solo nome, tipo,
// comune e completezza (decisione del 4 novembre 2026).
export async function listCustomers(search?: string): Promise<Customer[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("customers").select("*").order("name");
  const filter = customerSearchFilter(search);
  if (filter) query = query.or(filter);
  const { data, error } = await query;
  if (error) throw new Error("Clienti non letti");
  return data.map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Cliente non letto");
  return data ? toCustomer(data) : null;
}

export type CustomerAuthors = { createdBy: string; updatedBy: string };

const maintenance = "Procedura di manutenzione";

// Nomi di chi ha creato e modificato il cliente, da una funzione protetta che restituisce solo
// il nome del profilo (o l'email se manca) degli autori dei clienti.
export async function getCustomerAuthors(customer: Customer): Promise<CustomerAuthors> {
  const ids = [customer.createdBy, customer.updatedBy].filter((id): id is string => id !== null);
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("customer_author_names", { author_ids: ids });
    for (const row of data ?? []) names.set(row.user_id, row.label);
  }
  const name = (id: string | null) =>
    id === null ? maintenance : (names.get(id) ?? "un utente non più presente");
  return { createdBy: name(customer.createdBy), updatedBy: name(customer.updatedBy) };
}
