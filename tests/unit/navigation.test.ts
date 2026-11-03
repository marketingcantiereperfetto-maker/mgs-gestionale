import { describe, expect, it } from "vitest";
import { findPage, navigation, visibleNavigation } from "@/lib/navigation";
import { decidePageAccess } from "@/server/auth/page-access";
import type { CurrentUser, Session } from "@/server/auth/current-user";
import { can, type UserRole } from "@/server/auth/permissions";

function user(role: UserRole): CurrentUser {
  return {
    id: "utente-prova",
    email: "prova@prova.test",
    fullName: null,
    role,
    companyIds: [],
    isActive: true,
  };
}

function menuFor(role: UserRole) {
  const sections = visibleNavigation((action) => can(user(role), action));
  return Object.fromEntries(
    sections.map((section) => [
      section.label,
      section.page ? [] : (section.groups ?? []).flat().map((page) => page.label),
    ]),
  );
}

const allSections = [
  "Dashboard",
  "Preventivi",
  "Ordini",
  "Catalogo",
  "Clienti",
  "Statistiche",
  "Controllo di gestione",
  "Impostazioni",
  "Manuali",
];

describe("menu in alto", () => {
  it("ha le nove voci del capitolo 21, nell'ordine", () => {
    expect(navigation.map((section) => section.label)).toEqual(allSections);
  });

  it("ogni indirizzo compare una sola volta", () => {
    const hrefs = navigation.flatMap((section) =>
      section.page ? [section.page.href] : (section.groups ?? []).flat().map((page) => page.href),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("il titolare vede tutto", () => {
    expect(Object.keys(menuFor("owner"))).toEqual(allSections);
  });

  it("il consulente vede il catalogo commerciale, senza controllo di gestione e impostazioni", () => {
    const menu = menuFor("sales_consultant");
    expect(Object.keys(menu)).toEqual([
      "Dashboard",
      "Preventivi",
      "Ordini",
      "Catalogo",
      "Clienti",
      "Statistiche",
      "Manuali",
    ]);
    expect(menu.Catalogo).toEqual(["Wizard (articoli)", "Offerte attive"]);
    expect(menu.Preventivi).not.toContain("Richieste di autorizzazione");
    expect(menu.Clienti).not.toContain("Consulenti");
  });

  it("il responsabile commerciale vede autorizzazioni e consulenti", () => {
    const menu = menuFor("sales_manager");
    expect(menu.Preventivi).toContain("Richieste di autorizzazione");
    expect(menu.Clienti).toContain("Consulenti");
    expect(menu).not.toHaveProperty("Controllo di gestione");
  });

  it("l'amministrazione cataloghi gestisce il catalogo, non le impostazioni", () => {
    const menu = menuFor("catalog_admin");
    expect(menu.Catalogo).toContain("Materiali");
    expect(menu).not.toHaveProperty("Impostazioni");
    expect(menu).not.toHaveProperty("Controllo di gestione");
  });

  it("l'amministrazione economica vede il controllo di gestione", () => {
    const menu = menuFor("finance_admin");
    expect(menu).toHaveProperty("Controllo di gestione");
    expect(menu).not.toHaveProperty("Impostazioni");
  });
});

describe("accesso diretto alle pagine (controllo sul server)", () => {
  const active = (role: UserRole): Session => ({ status: "active", user: user(role) });

  it("chi apre a mano una sezione non consentita torna alla dashboard", () => {
    expect(decidePageAccess(active("sales_consultant"), "/impostazioni/societa-e-brand")).toEqual({
      kind: "redirect",
      to: "/?accesso=negato",
    });
    expect(decidePageAccess(active("sales_consultant"), "/catalogo/materiali")).toMatchObject({
      to: "/?accesso=negato",
    });
    expect(decidePageAccess(active("catalog_admin"), "/controllo-di-gestione")).toMatchObject({
      to: "/?accesso=negato",
    });
    expect(decidePageAccess(active("finance_admin"), "/impostazioni/utenti-e-ruoli")).toMatchObject(
      { to: "/?accesso=negato" },
    );
  });

  it("le sezioni consentite si aprono", () => {
    expect(decidePageAccess(active("sales_consultant"), "/catalogo/wizard").kind).toBe("show");
    expect(decidePageAccess(active("owner"), "/impostazioni/utenti-e-ruoli").kind).toBe("show");
  });

  it("chi non è collegato o non ha scelto la password non vede le pagine", () => {
    expect(decidePageAccess({ status: "anonymous" }, "/preventivi")).toEqual({
      kind: "redirect",
      to: "/accedi",
    });
    expect(decidePageAccess({ status: "password-required" }, "/preventivi")).toEqual({
      kind: "redirect",
      to: "/imposta-password",
    });
    expect(
      decidePageAccess({ status: "without-profile", email: "x@prova.test" }, "/preventivi"),
    ).toEqual({ kind: "redirect", to: "/" });
  });

  it("un indirizzo inesistente dà «pagina non trovata»", () => {
    expect(decidePageAccess(active("owner"), "/non-esiste").kind).toBe("not-found");
    expect(findPage("/catalogo")).toBeNull();
  });
});
