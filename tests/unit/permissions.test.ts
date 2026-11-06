import { describe, expect, it } from "vitest";
import {
  can,
  permissionKeys,
  type Action,
  type AppUser,
  type UserRole,
} from "@/server/auth/permissions";
import { presetsBeforeK0, presetUser } from "./support/role-presets";

const companyA = "00000000-0000-0000-0000-00000000000a";
const companyB = "00000000-0000-0000-0000-00000000000b";

// Utenti con i soli preset del ruolo: i test qui sotto sono quelli di prima della K0, invariati.
function user(role: UserRole, overrides: Partial<AppUser> = {}): AppUser {
  return presetUser(role, { companyIds: [companyA], ...overrides });
}

describe("can: costi e margini", () => {
  it("un consulente non vede costi e margini", () => {
    const consulente = user("sales_consultant");
    expect(can(consulente, "costs.view")).toBe(false);
    expect(can(consulente, "margins.view")).toBe(false);
    expect(can(consulente, "costs.view", { companyId: companyA })).toBe(false);
    expect(can(consulente, "margins.view", { companyId: companyA })).toBe(false);
  });

  it("il responsabile commerciale non vede costi e margini", () => {
    expect(can(user("sales_manager"), "costs.view")).toBe(false);
    expect(can(user("sales_manager"), "margins.view")).toBe(false);
  });

  it("l'amministrazione cataloghi vede i costi ma non i margini", () => {
    expect(can(user("catalog_admin"), "costs.view")).toBe(true);
    expect(can(user("catalog_admin"), "margins.view")).toBe(false);
  });

  it("l'amministrazione economica e il titolare vedono costi e margini", () => {
    for (const role of ["finance_admin", "owner"] as const) {
      expect(can(user(role), "costs.view")).toBe(true);
      expect(can(user(role), "margins.view")).toBe(true);
    }
  });
});

describe("can: società", () => {
  it("un ruolo autorizzato agisce solo sulle proprie società", () => {
    const economica = user("finance_admin");
    expect(can(economica, "margins.view", { companyId: companyA })).toBe(true);
    expect(can(economica, "margins.view", { companyId: companyB })).toBe(false);
  });

  it("il titolare agisce su tutte le società, anche senza collegamenti", () => {
    const titolare = user("owner", { companyIds: [] });
    expect(can(titolare, "margins.view", { companyId: companyB })).toBe(true);
  });
});

describe("can: casi di blocco", () => {
  const allActions: Action[] = [
    "costs.view",
    "margins.view",
    "audit_log.view",
    "users.manage",
    "settings.manage",
    "catalog.manage",
  ];

  it("nessun permesso senza utente collegato", () => {
    for (const action of allActions) expect(can(null, action)).toBe(false);
  });

  it("nessun permesso a un utente disattivato, nemmeno al titolare", () => {
    const disattivato = user("owner", { isActive: false });
    for (const action of allActions) expect(can(disattivato, action)).toBe(false);
  });

  it("solo il titolare gestisce utenti e impostazioni", () => {
    const roles: UserRole[] = [
      "sales_manager",
      "sales_consultant",
      "catalog_admin",
      "finance_admin",
    ];
    for (const role of roles) {
      expect(can(user(role), "users.manage")).toBe(false);
      expect(can(user(role), "settings.manage")).toBe(false);
    }
    expect(can(user("owner"), "users.manage")).toBe(true);
    expect(can(user("owner"), "settings.manage")).toBe(true);
  });

  it("il catalogo lo gestiscono l'amministrazione cataloghi e il titolare, separato da utenti e impostazioni", () => {
    expect(can(user("catalog_admin"), "catalog.manage")).toBe(true);
    expect(can(user("owner"), "catalog.manage")).toBe(true);
    for (const role of ["sales_manager", "sales_consultant", "finance_admin"] as const) {
      expect(can(user(role), "catalog.manage")).toBe(false);
    }
    expect(can(user("catalog_admin"), "users.manage")).toBe(false);
    expect(can(user("catalog_admin"), "settings.manage")).toBe(false);
  });

  it("l'amministrazione cataloghi gestisce il catalogo solo delle proprie società", () => {
    const cataloghi = user("catalog_admin");
    expect(can(cataloghi, "catalog.manage", { companyId: companyA })).toBe(true);
    expect(can(cataloghi, "catalog.manage", { companyId: companyB })).toBe(false);
  });
});

describe("can: facoltà per utente (K0a)", () => {
  it("guarda le facoltà effettive, non il ruolo: permesso aggiunto", () => {
    const consulente = user("sales_consultant");
    expect(can(consulente, "customers.deactivate")).toBe(false);
    const conPermesso = user("sales_consultant", {
      permissions: [...presetsBeforeK0.sales_consultant, "customers.deactivate"],
    });
    expect(can(conPermesso, "customers.deactivate")).toBe(true);
  });

  it("permesso tolto: anche un ruolo che lo aveva non lo usa più", () => {
    const responsabile = user("sales_manager", {
      permissions: presetsBeforeK0.sales_manager.filter((action) => action !== "customers.edit"),
    });
    expect(can(responsabile, "customers.edit")).toBe(false);
    expect(can(responsabile, "customers.view")).toBe(true);
  });

  it("il ruolo da solo non basta: un titolare senza facoltà caricate non può nulla", () => {
    const vuoto = user("owner", { permissions: [] });
    for (const action of permissionKeys) expect(can(vuoto, action)).toBe(false);
  });

  it("tutte le società solo con «gestire le società»", () => {
    const economica = user("finance_admin", {
      permissions: [...presetsBeforeK0.finance_admin, "companies.manage"],
    });
    expect(can(economica, "margins.view", { companyId: companyB })).toBe(true);
  });
});
