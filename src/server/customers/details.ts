import type { AddressData, ContactData } from "@/domain/customers/details";
import { createSupabaseServerClient } from "@/server/supabase";

// Referenti e indirizzi di consegna: si leggono solo nella scheda del singolo cliente, mai
// nell'elenco (decisioni del 4 novembre 2026).

export type CustomerContact = ContactData & { id: string; isPrimary: boolean; isActive: boolean };
export type CustomerAddress = AddressData & { id: string; isDefault: boolean; isActive: boolean };

export async function listCustomerContacts(customerId: string): Promise<CustomerContact[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_contacts")
    .select("id, name, role, email, phone, is_primary, is_active")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("name");
  if (error) throw new Error("Referenti non letti");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    isPrimary: row.is_primary,
    isActive: row.is_active,
  }));
}

export async function listCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_delivery_addresses")
    .select("id, description, street, postal_code, city, province, country, is_default, is_active")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw new Error("Indirizzi non letti");
  return data.map((row) => ({
    id: row.id,
    description: row.description,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    province: row.province,
    country: row.country,
    isDefault: row.is_default,
    isActive: row.is_active,
  }));
}
