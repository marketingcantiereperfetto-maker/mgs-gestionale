import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  roles,
  sessionFile,
  signIn,
} from "./support/temporary-users";
import type { UserRole } from "../../src/server/auth/permissions";

// Prove con un utente vero per ruolo: le sessioni salvate da accessi.setup.ts (un solo accesso
// per ruolo a ogni giro).
test.skip(!canUseTemporaryUsers, "servono le variabili del Supabase locale (npm run test:e2e)");
test.describe.configure({ mode: "serial" });

async function pageAs(browser: Browser, role: UserRole): Promise<Page> {
  const context = await browser.newContext({ storageState: sessionFile(role) });
  return context.newPage();
}

const menuBar = (page: Page) => page.getByRole("navigation", { name: "Menu principale" });

// Le nove voci principali: per le tendine si apre la prima voce della tendina.
const mainEntries = [
  { label: "Dashboard", href: "/", title: "Dashboard" },
  {
    label: "Preventivi",
    item: "Nuovo preventivo",
    href: "/preventivi/nuovo",
    title: "Nuovo preventivo",
  },
  { label: "Ordini", item: "Tutti", href: "/ordini", title: "Ordini" },
  { label: "Catalogo", item: "Categorie", href: "/catalogo/categorie", title: "Categorie" },
  {
    label: "Clienti",
    item: "Consulenti",
    href: "/clienti/consulenti",
    title: "Consulenti",
  },
  { label: "Statistiche", item: "Panoramica", href: "/statistiche", title: "Statistiche" },
  {
    label: "Controllo di gestione",
    item: "Panoramica",
    href: "/controllo-di-gestione",
    title: "Controllo di gestione",
  },
  {
    label: "Impostazioni",
    item: "Reparti e macchinari",
    href: "/impostazioni/reparti-e-macchinari",
    title: "Reparti e macchinari",
  },
  { label: "Manuali", href: "/manuali", title: "Manuali" },
];

for (const entry of mainEntries) {
  test(`voce «${entry.label}»: si apre la sua pagina con lo stato vuoto`, async ({ browser }) => {
    const page = await pageAs(browser, "owner");
    await page.goto(entry.href === "/" ? "/manuali" : "/");
    if (entry.item) {
      await menuBar(page).getByRole("button", { name: entry.label, exact: true }).click();
      await menuBar(page).getByRole("link", { name: entry.item, exact: true }).click();
    } else {
      await menuBar(page).getByRole("link", { name: entry.label, exact: true }).click();
    }
    await expect(page).toHaveURL(entry.href);
    await expect(page.getByRole("heading", { level: 1, name: entry.title })).toBeVisible();
    await expect(page.getByTestId("empty-state")).toBeVisible();
    // Nessun importo né zero finto: la pagina dice solo cosa manca.
    await expect(page.locator("main")).not.toHaveText(/€|(^|\s)0([,.]\d+)?(\s|$)/);
  });
}

const expectedMenus: Record<UserRole, string[]> = {
  owner: mainEntries.map((entry) => entry.label),
  sales_manager: [
    "Dashboard",
    "Preventivi",
    "Ordini",
    "Catalogo",
    "Clienti",
    "Statistiche",
    "Manuali",
  ],
  sales_consultant: [
    "Dashboard",
    "Preventivi",
    "Ordini",
    "Catalogo",
    "Clienti",
    "Statistiche",
    "Manuali",
  ],
  catalog_admin: ["Dashboard", "Preventivi", "Ordini", "Catalogo", "Statistiche", "Manuali"],
  finance_admin: [
    "Dashboard",
    "Preventivi",
    "Ordini",
    "Catalogo",
    "Clienti",
    "Statistiche",
    "Controllo di gestione",
    // Solo per il registro delle modifiche (decisione del 6 novembre 2026).
    "Impostazioni",
    "Manuali",
  ],
};

for (const role of roles) {
  test(`menu per ruolo: ${role}`, async ({ browser }) => {
    const page = await pageAs(browser, role);
    await page.goto("/");
    const labels = await menuBar(page).locator("[data-menubar-trigger]").allInnerTexts();
    // L'ultima voce della barra è il menu utente (le iniziali).
    expect(labels.slice(0, -1)).toEqual(expectedMenus[role]);
  });
}

test("il consulente vede solo il catalogo commerciale", async ({ browser }) => {
  const page = await pageAs(browser, "sales_consultant");
  await page.goto("/");
  await menuBar(page).getByRole("button", { name: "Catalogo", exact: true }).click();
  await expect(menuBar(page).getByRole("link", { name: "Wizard (articoli)" })).toBeVisible();
  await expect(menuBar(page).getByRole("link", { name: "Offerte attive" })).toBeVisible();
  await expect(menuBar(page).getByRole("link", { name: "Materiali" })).toHaveCount(0);
});

test("accesso diretto a una sezione non consentita: si torna alla dashboard", async ({
  browser,
}) => {
  const denied: [UserRole, string][] = [
    ["sales_consultant", "/impostazioni/societa-e-brand"],
    ["sales_consultant", "/catalogo/materiali"],
    ["sales_consultant", "/controllo-di-gestione"],
    ["catalog_admin", "/controllo-di-gestione/conto-economico"],
    ["catalog_admin", "/clienti"],
    ["finance_admin", "/impostazioni/utenti-e-ruoli"],
    ["sales_manager", "/catalogo/regole-di-ricarico"],
  ];
  for (const [role, href] of denied) {
    const page = await pageAs(browser, role);
    await page.goto(href);
    await expect(page, `${role} su ${href}`).toHaveURL("/?accesso=negato");
    await expect(
      page.getByRole("alert").filter({ hasText: "Non hai accesso a quella sezione" }),
    ).toBeVisible();
    await page.context().close();
  }
});

test("tendine da tastiera: frecce per scorrere, Esc per chiudere", async ({ browser }) => {
  const page = await pageAs(browser, "owner");
  await page.goto("/");
  const quotes = menuBar(page).getByRole("button", { name: "Preventivi", exact: true });
  await quotes.focus();
  await page.keyboard.press("ArrowDown");
  await expect(quotes).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Nuovo preventivo" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("link", { name: "Tutti", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const orders = menuBar(page).getByRole("button", { name: "Ordini", exact: true });
  await expect(orders).toBeFocused();
  await expect(orders).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(orders).toHaveAttribute("aria-expanded", "false");
});

test("il menu utente mostra nome e ruolo, ed Esci porta alla pagina di accesso", async ({
  browser,
}) => {
  // Prova sull'accesso stesso: utente e accesso dedicati, perché uscire chiude tutte le sessioni
  // dell'utente (anche quella salvata del ruolo).
  const user = await createTemporaryUser("sales_consultant");
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  await page.getByRole("button", { name: /Menu utente/ }).click();
  await expect(page.getByText("Consulente", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/accedi$/);
  await context.close();
  await deleteTemporaryUser(user);
});
