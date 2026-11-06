import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestCustomers, runPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Permessi per utente (K0a): un permesso aggiunto o tolto cambia davvero cosa si può fare.
// La pagina per gestire i permessi arriva con K0b: qui le eccezioni si scrivono direttamente
// nel database di prova. Dati e utenti inventati, cancellati alla fine.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const customerName = `${mine} Cliente permessi`;
let consultant: TemporaryUser;
let finance: TemporaryUser;
let customerPath = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  consultant = await createTemporaryUser("sales_consultant");
  finance = await createTemporaryUser("finance_admin");
  const { data, error } = await admin()
    .from("customers")
    .insert({ name: customerName })
    .select("id")
    .single();
  if (error) throw new Error(`Cliente di prova non creato: ${error.message}`);
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
  await signIn(page, consultant);
  await openCustomer(page);
  await expect(page.getByRole("heading", { name: "Disattiva il cliente" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salva", exact: true })).toBeVisible();
});

test("permesso aggiunto: la consulente disattiva e riattiva il cliente", async ({ page }) => {
  await setException(consultant, "customers.deactivate", true);
  await signIn(page, consultant);
  await openCustomer(page);
  await expect(page.getByRole("heading", { name: "Disattiva il cliente" })).toBeVisible();
  await page.getByRole("button", { name: "Disattiva", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cliente disattivato." })).toBeVisible();
  await page.getByRole("button", { name: "Riattiva", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cliente riattivato." })).toBeVisible();
});

test("permesso tolto: senza «modificare clienti» il salvataggio è rifiutato", async ({ page }) => {
  await setException(consultant, "customers.edit", false);
  await signIn(page, consultant);
  await openCustomer(page);
  await page.getByLabel("Comune").fill("Comune Non Permesso");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Non puoi modificare i clienti." }),
  ).toBeVisible();
  const { data } = await admin()
    .from("customers")
    .select("address_city")
    .eq("name", customerName)
    .single();
  expect(data?.address_city).toBeNull();
});

test("permesso tolto: senza «vedere i clienti» la sezione sparisce", async ({ page }) => {
  await setException(consultant, "customers.view", false);
  await signIn(page, consultant);
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await expect(menu.getByRole("button", { name: "Clienti", exact: true })).toHaveCount(0);
  await page.goto(customerPath);
  await expect(page).toHaveURL("/?accesso=negato");
});

test("l'amministrazione economica apre il registro delle modifiche", async ({ page }) => {
  await signIn(page, finance);
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
