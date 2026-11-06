import type { Action, AppUser, UserRole } from "@/server/auth/permissions";

// Facoltà dei ruoli come erano prima della K0 (tabella del 3-4 novembre 2026), più le due nuove
// del titolare. Riferimento per i test: con i soli preset il comportamento resta identico.
// Le stesse liste sono controllate nel database da supabase/tests/database/permessi.test.sql.
export const presetsBeforeK0: Record<UserRole, readonly Action[]> = {
  owner: [
    "costs.view",
    "margins.view",
    "users.manage",
    "customers.export",
    "approvals.below_threshold",
    "settings.manage",
    "companies.manage",
    "audit_log.view",
    "catalog.manage",
    "management_control.view",
    "approvals.view",
    "consultants.view",
    "customers.view",
    "customers.edit",
    "customers.deactivate",
    "customers.group_company",
  ],
  finance_admin: [
    "costs.view",
    "margins.view",
    "audit_log.view",
    "management_control.view",
    "customers.view",
    "customers.edit",
    "customers.group_company",
  ],
  catalog_admin: ["costs.view", "catalog.manage"],
  sales_manager: [
    "approvals.view",
    "consultants.view",
    "customers.view",
    "customers.edit",
    "customers.deactivate",
  ],
  sales_consultant: ["customers.view", "customers.edit"],
};

export function presetUser(role: UserRole, overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "utente-prova",
    role,
    companyIds: [],
    isActive: true,
    permissions: presetsBeforeK0[role],
    ...overrides,
  };
}
