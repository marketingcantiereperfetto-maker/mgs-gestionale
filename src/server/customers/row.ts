import type { CustomerData, SubjectType, VatRegime } from "@/domain/customers/customer";
import type { Database } from "@/lib/supabase/database.types";

// Conversione tra le righe del database e i clienti dell'app, senza collegamenti: la usano le
// letture del server e le prove nel browser.

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
