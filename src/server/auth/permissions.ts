import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

// Elenco dei permessi (architettura v6 §20.2, K0a, decisioni del 6 novembre 2026). Deve
// coincidere con la tabella `permissions` del database: i preset dei ruoli e le eccezioni per
// utente stanno nel database, che calcola le facoltà effettive (`my_permissions`).
export const permissionKeys = [
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
] as const;

export type Action = (typeof permissionKeys)[number];

export function isAction(value: string): value is Action {
  return (permissionKeys as readonly string[]).includes(value);
}

export type AppUser = {
  id: string;
  role: UserRole;
  companyIds: readonly string[];
  isActive: boolean;
  // Facoltà effettive: preset del ruolo, più i permessi aggiunti, meno quelli tolti.
  permissions: readonly Action[];
};

export type Scope = {
  companyId?: string;
};

export const roleLabels: Record<UserRole, string> = {
  owner: "Titolare",
  sales_manager: "Responsabile commerciale",
  sales_consultant: "Consulente",
  catalog_admin: "Amministrazione cataloghi",
  finance_admin: "Amministrazione economica",
};

// Il controllo centrale guarda le facoltà dell'utente, non il ruolo. Con un ambito di società,
// chi gestisce le società agisce su tutte; gli altri solo su quelle a cui sono collegati.
export function can(user: AppUser | null, action: Action, scope: Scope = {}): boolean {
  if (!user || !user.isActive) return false;
  if (!user.permissions.includes(action)) return false;
  if (scope.companyId === undefined || user.permissions.includes("companies.manage")) return true;
  return user.companyIds.includes(scope.companyId);
}
