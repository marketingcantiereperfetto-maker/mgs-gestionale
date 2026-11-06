import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestCustomers, runPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  openSession,
  roleUser,
  type TemporaryUser,
  type TestUser,
} from "./support/temporary-users";

// Permessi per utente (K0a): un permesso aggiunto o tolto cambia davvero cosa si può fare.
// La pagina per gestire i permessi arriva con K0b: qui le eccezioni si scrivono direttamente
// nel database locale. Dati e utenti inventati.
test.skip(!canUseTemporaryUsers, "servono le variabili del Supabase locale (npm run test:e2e)");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const customerName = `${mine} Cliente permessi`;
let consultant: TemporaryUser;
let finance: TestUser;
let customerId = "";
let customerPath = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  // Consulente dedicata: i suoi permessi cambiano durante le prove.
  consultant = await createTemporaryUser("sales_consultant");
  finance = roleUser("finance_admin");
  const { data, error } = await admin()
    .from("customers")
    .insert({ name: customerName })
    .select("id")
    .single();
  if (error) throw new Error(`Cliente di prova non creato: ${error.message}`);
  customerId = data.id;
  customerPath = `/clienti/${data.id}`;
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  // Le eccezioni si cancellano con il profilo dell'utente.
  await deleteTemporaryUser(consultant);
  await deleteTemporaryUser(finance);
  await deleteTestCustomers({ prefix: mine });
});

async function setException(user: TemporaryUser, permission: string, granted: boolean) {
  const { error } = await admin()
    .from("user_permissions")
    .upsert({ user_id: user.id, permission, granted });
  expect(error).toBeNull();
}

async function openCustomer(page: Page) {
  await page.goto(customerPath);
  await page.waitForLoadState("networkidle");
}

test("solo preset: la consulente modifica ma non disattiva", async ({ page }) => {
  await openSession(page, consultant);
  await openCustomer(page);
  await expect(page.getByRole("heading", { name: "Disattiva il cliente" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salva", exact: true })).toBeVisible();
});

test("permesso aggiunto: la consulente disattiva e riattiva il cliente", async ({ page }) => {
  await setException(consultant, "customers.deactivate", true);
  await openSession(page, consultant);
  await openCustomer(page);
  await expect(page.getByRole("heading", { name: "Disattiva il cliente" })).toBeVisible();
  await page.getByRole("button", { name: "Disattiva", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cliente disattivato." })).toBeVisible();
  await page.getByRole("button", { name: "Riattiva", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cliente riattivato." })).toBeVisible();
});

test("permesso tolto: senza «modificare clienti» il salvataggio è rifiutato", async ({ page }) => {
  await setException(consultant, "customers.edit", false);
  await openSession(page, consultant);
  await openCustomer(page);
  await page.getByLabel("Comune").fill("Comune Non Permesso");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Non puoi modificare i clienti." }),
  ).toBeVisible();
  const { data } = await admin()
    .from("customers")
    .select("address_city")
    .eq("id", customerId)
    .single();
  expect(data?.address_city).toBeNull();
});

test("permesso tolto: senza «vedere i clienti» la sezione sparisce", async ({ page }) => {
  await setException(consultant, "customers.view", false);
  await openSession(page, consultant);
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await expect(menu.getByRole("button", { name: "Clienti", exact: true })).toHaveCount(0);
  await page.goto(customerPath);
  await expect(page).toHaveURL("/?accesso=negato");
});

test("l'amministrazione economica apre il registro delle modifiche", async ({ page }) => {
  await openSession(page, finance);
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await menu.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await menu.getByRole("link", { name: "Registro delle modifiche" }).click();
  await page.waitForURL("/impostazioni/registro-delle-modifiche");
  await expect(
    page.getByRole("heading", { level: 1, name: "Registro delle modifiche" }),
  ).toBeVisible();
  await expect(menu.getByRole("link", { name: "Società e brand" })).toHaveCount(0);
});

test("permessi non verificati: messaggio chiaro con «Riprova»", async ({ page }) => {
  await openSession(page, consultant);
  await page.goto("/verifica-permessi?da=%2Fclienti");
  // C'è anche l'avviso di navigazione di Next.js (anch'esso «alert»): si cerca il messaggio.
  await expect(
    page.getByRole("alert").filter({ hasText: "Impossibile verificare i permessi, riprova." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Riprova" })).toHaveAttribute("href", "/clienti");
  // Un indirizzo esterno non diventa mai la destinazione di «Riprova».
  await page.goto("/verifica-permessi?da=https%3A%2F%2Fesempio.test");
  await expect(page.getByRole("link", { name: "Riprova" })).toHaveAttribute("href", "/");
});
