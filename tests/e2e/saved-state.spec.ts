import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestBrands, deleteTestCompanies, runPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Dopo un salvataggio i campi mostrano sempre i dati salvati, senza ricaricare la pagina
// (regola di CLAUDE.md). Dati inventati, cancellati alla fine, solo sul progetto di prova.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));

const run = randomUUID().slice(0, 8);
const companyName = `${mine} Stato salvato ${run} Srl`;
const brandName = `${mine} Brand stato ${run}`;
let owner: TemporaryUser;
let companyId = "";
let brandId = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  owner = await createTemporaryUser("owner");
  const company = await admin()
    .from("companies")
    .insert({ legal_name: companyName })
    .select("id")
    .single();
  const brand = await admin().from("brands").insert({ name: brandName }).select("id").single();
  if (company.error || brand.error) throw new Error("Dati di prova non creati");
  companyId = company.data.id;
  brandId = brand.data.id;
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await deleteTestBrands({ prefix: mine });
  await deleteTestCompanies({ prefix: mine });
  await deleteTemporaryUser(owner);
});

async function openReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });

test("collegamento: la spunta resta dopo il salvataggio, dopo il ricaricamento e quando si toglie", async ({
  page,
}) => {
  await signIn(page, owner);
  await openReady(page, `/impostazioni/societa-e-brand/brand/${brandId}`);
  const box = () => page.getByRole("checkbox", { name: companyName });
  const save = page.getByRole("button", { name: "Salva collegamenti" });

  await box().check();
  await save.click();
  await expect(status(page, "Collegamenti salvati.")).toBeVisible();
  await expect(box()).toBeChecked();

  await page.reload();
  await expect(box()).toBeChecked();

  await box().uncheck();
  await save.click();
  await expect(page.getByText("Il brand ora non è collegato a nessuna società.")).toBeVisible();
  await expect(box()).not.toBeChecked();
  await page.reload();
  await expect(box()).not.toBeChecked();

  const { data } = await admin()
    .from("company_brands")
    .select("company_id")
    .eq("brand_id", brandId);
  expect(data).toEqual([]);
});

test("dati della società: dopo «Salva» i campi mostrano i valori salvati (anche il paese)", async ({
  page,
}) => {
  await signIn(page, owner);
  await openReady(page, `/impostazioni/societa-e-brand/societa/${companyId}`);
  const country = () => page.getByLabel("Paese (codice a due lettere)");

  await page.getByLabel("Codice fiscale").fill(" rssmra85t10a562s ");
  await page.getByLabel("Comune").fill("  Comune   di Prova ");
  await page.getByRole("button", { name: "Italia" }).click();
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Società salvata.")).toBeVisible();

  // Valori come salvati: normalizzati, senza ricaricare.
  await expect(page.getByLabel("Codice fiscale")).toHaveValue("RSSMRA85T10A562S");
  await expect(page.getByLabel("Comune")).toHaveValue("Comune di Prova");
  await expect(country()).toHaveValue("IT");
  await expect(page.locator("#addressCountry-name")).toHaveText("Italia");

  // Paese scritto in minuscolo: dopo il salvataggio compare come è stato salvato.
  await country().fill("de");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Società salvata.")).toBeVisible();
  await expect(country()).toHaveValue("DE");

  await page.reload();
  await expect(page.getByLabel("Codice fiscale")).toHaveValue("RSSMRA85T10A562S");
  await expect(country()).toHaveValue("DE");
});

test("nome del brand: dopo «Salva» il campo mostra il nome salvato", async ({ page }) => {
  await signIn(page, owner);
  await openReady(page, `/impostazioni/societa-e-brand/brand/${brandId}`);
  const name = page.getByLabel("Nome del brand");
  await name.fill(`  ${brandName}   Nuovo `);
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(status(page, "Brand salvato.")).toBeVisible();
  await expect(name).toHaveValue(`${brandName} Nuovo`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${brandName} Nuovo`);
});
