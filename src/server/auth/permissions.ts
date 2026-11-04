import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Action =
  | "costs.view"
  | "margins.view"
  | "audit_log.view"
  | "users.manage"
  | "settings.manage"
  | "catalog.manage"
  | "management_control.view"
  | "approvals.view"
  | "consultants.view"
  | "companies.manage"
  | "customers.view"
  | "customers.edit"
  | "customers.deactivate"
  | "customers.group_company";

export type AppUser = {
  id: string;
  role: UserRole;
  companyIds: readonly string[];
  isActive: boolean;
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

// Facoltà dei 5 modelli di ruolo (cap. 20.1, decisioni del 3 novembre 2026). Costi e margini
// solo ai ruoli autorizzati (principio 7): l'amministrazione cataloghi vede i costi perché li
// inserisce. Il catalogo (materiali, lavorazioni, Wizard) è separato da utenti e impostazioni.
// Controllo di gestione, richieste di autorizzazione e consulenti: proposta provvisoria del
// 3 novembre 2026, da rivedere quando arrivano i dati. Società, brand e conti: solo il titolare.
// Clienti (decisioni del 4 novembre 2026): tutti i ruoli commerciali ed economici vedono e
// modificano tutti i clienti; disattivano titolare e responsabile commerciale; la società del
// gruppo la indicano titolare e amministrazione economica; l'amministrazione cataloghi no.
const roleActions: Record<UserRole, readonly Action[]> = {
  owner: [
    "costs.view",
    "margins.view",
    "audit_log.view",
    "users.manage",
    "settings.manage",
    "catalog.manage",
    "management_control.view",
    "approvals.view",
    "consultants.view",
    "companies.manage",
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

export function can(user: AppUser | null, action: Action, scope: Scope = {}): boolean {
  if (!user || !user.isActive) return false;
  if (!roleActions[user.role].includes(action)) return false;
  if (user.role === "owner" || scope.companyId === undefined) return true;
  return user.companyIds.includes(scope.companyId);
}
