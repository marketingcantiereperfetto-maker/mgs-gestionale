import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestBrands, deleteTestCompanies, runPrefix, testPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  deleteTemporaryUser,
  openSession,
  roleUser,
  type TestUser,
} from "./support/temporary-users";

// Percorso guidato con dati inventati, cancellati alla fine (solo sul progetto di prova).
// Gira da solo e per ultimo (progetto «percorso-guidato»). Se nel database ci sono società o
// brand attivi che non sono di prova, si salta: lo stato del percorso non sarebbe controllabile.
test.skip(!canUseTemporaryUsers, "servono le variabili del Supabase locale (npm run test:e2e)");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const companyName = `${mine} Percorso Srl`;
const brandName = `${mine} Brand percorso`;
let owner: TestUser;
let consultant: TestUser;
let realData = false;
// Clienti attivi già presenti (per esempio il «CLIENTE PROVA» del titolare, che non si tocca):
// in quel caso il passo dei clienti è già «Fatto». Il caso «Da fare» lo coprono i test di unità.
let hasActiveCustomers = false;
const customersStep = 7;
const fullMessage =
  "La configurazione di società, conti, brand e clienti è completa. Gli altri passi arriveranno con le prossime funzioni.";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  const [companies, brands] = await Promise.all([
    admin()
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("legal_name", "like", `${testPrefix}%`),
    admin()
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("name", "like", `${testPrefix}%`),
  ]);
  realData = (companies.count ?? 0) + (brands.count ?? 0) > 0;
  if (realData) return;
  const customers = await admin()
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  hasActiveCustomers = (customers.count ?? 0) > 0;
  // Gira da solo: si possono togliere tutti i resti di prove precedenti.
  await deleteTestBrands({ prefix: testPrefix });
  await deleteTestCompanies({ prefix: testPrefix });
  owner = roleUser("owner");
  consultant = roleUser("sales_consultant");
});

test.beforeEach(() => {
  test.skip(
    realData,
    "Saltata: nel database di prova ci sono società o brand attivi non di prova, quindi lo stato del percorso non è controllabile.",
  );
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  if (realData) return;
  await deleteTestBrands({ prefix: mine });
  await deleteTestCompanies({ prefix: mine });
  await deleteTemporaryUser(owner);
  await deleteTemporaryUser(consultant);
});

const steps = (page: Page) => page.getByTestId("setup-step");
const step = (page: Page, index: number) => steps(page).nth(index);

async function dashboard(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function expectStatuses(page: Page, first4: string[]) {
  await expect(steps(page)).toHaveCount(12);
  for (const [index, status] of first4.entries()) {
    await expect(step(page, index)).toHaveAttribute("data-status", status);
  }
}

test("archivio vuoto: quattro passi da fare, gli altri arriveranno, senza pulsanti finti", async ({
  page,
}) => {
  await openSession(page, owner);
  await dashboard(page);
  await expectStatuses(page, ["todo", "todo", "todo", "todo"]);
  // Lo stato è scritto a parole, non solo a colori.
  await expect(step(page, 0)).toContainText("Da fare");
  for (let index = 4; index < 12; index++) {
    if (index === customersStep) continue;
    await expect(step(page, index)).toContainText("Arriverà");
    await expect(step(page, index).getByRole("link")).toHaveCount(0);
  }
  // Il passo dei clienti è calcolato sui dati; l'importazione resta «arriverà».
  const customers = step(page, customersStep);
  await expect(customers).toContainText("Creare o importare le anagrafiche clienti");
  await expect(customers).toContainText("L'importazione dal vecchio gestionale arriverà.");
  if (hasActiveCustomers) {
    await expect(customers).toHaveAttribute("data-status", "done");
    await expect(customers).toContainText("Fatto");
    await expect(customers.getByRole("link")).toHaveCount(0);
  } else {
    await expect(customers).toHaveAttribute("data-status", "todo");
    await expect(customers.getByRole("link", { name: "Aggiungi cliente" })).toBeVisible();
  }
  await expect(step(page, 5)).toContainText("Il titolare è già attivo");
  await expect(step(page, 1)).toContainText("Prima crea una società.");
  await expect(step(page, 1).getByRole("link")).toHaveCount(0);
  await expect(page.getByText(/è completa/)).toHaveCount(0);

  // Il primo pulsante si raggiunge da tastiera.
  const add = step(page, 0).getByRole("link", { name: "Aggiungi società" });
  for (
    let tab = 0;
    tab < 30 && !(await add.evaluate((el) => el === document.activeElement));
    tab++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(add).toBeFocused();
});

test("da «da fare» a «fatto», un passo alla volta", async ({ page }) => {
  test.setTimeout(90_000);
  await openSession(page, owner);
  await dashboard(page);

  // 1. Società.
  await step(page, 0).getByRole("link", { name: "Aggiungi società" }).click();
  await page.getByLabel("Ragione sociale").fill(companyName);
  await page.getByRole("button", { name: "Crea società" }).click();
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible();
  await dashboard(page);
  await expectStatuses(page, ["done", "todo", "todo", "todo"]);
  await expect(step(page, 1)).toContainText(
    `${companyName} (mancano partita IVA, codice fiscale, sede legale completa, email)`,
  );
  await expect(step(page, 2)).toContainText(`Senza conto bancario attivo: ${companyName}.`);

  // 2. Dati completi.
  await step(page, 1)
    .getByRole("link", { name: `Completa ${companyName}` })
    .click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Partita IVA").fill("01234567897");
  await page.getByLabel("Codice fiscale").fill("01234567897");
  await page.getByLabel("Email").fill("amministrazione@prova.test");
  await page.getByLabel("Via e numero civico").fill("Via di Prova 1");
  await page.getByLabel("CAP").fill("00100");
  await page.getByLabel("Comune").fill("Comune di Prova");
  await page.getByLabel("Provincia").fill("RM");
  await page.getByRole("button", { name: "Italia" }).click();
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Società salvata." })).toBeVisible();
  await dashboard(page);
  await expectStatuses(page, ["done", "done", "todo", "todo"]);

  // 3. Conto.
  await step(page, 2)
    .getByRole("link", { name: `Aggiungi un conto a ${companyName}` })
    .click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("IBAN").fill("IT60X0542811101000000123456");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Conto aggiunto." })).toBeVisible();
  await dashboard(page);
  await expectStatuses(page, ["done", "done", "done", "todo"]);

  // 4. Brand creato, poi collegato.
  await step(page, 3).getByRole("link", { name: "Aggiungi brand" }).click();
  await page.getByLabel("Nome del brand").fill(brandName);
  await page.getByRole("button", { name: "Crea brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: brandName })).toBeVisible();
  await dashboard(page);
  await expectStatuses(page, ["done", "done", "done", "todo"]);
  await step(page, 3)
    .getByRole("link", { name: `Collega ${brandName}` })
    .click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("checkbox", { name: companyName }).check();
  await page.getByRole("button", { name: "Salva collegamenti" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Collegamenti salvati." })).toBeVisible();

  await dashboard(page);
  await expectStatuses(page, ["done", "done", "done", "done"]);
  // Completa solo se c'è anche almeno un cliente attivo.
  await expect(page.getByText(fullMessage)).toHaveCount(hasActiveCustomers ? 1 : 0);
  for (let index = 0; index < 4; index++) {
    await expect(step(page, index).getByRole("link")).toHaveCount(0);
  }
});

test("più di 5 società da completare: i primi 5 nomi e «e altre N»", async ({ page }) => {
  const names = Array.from({ length: 7 }, (_, index) => ({ legal_name: `${mine} Extra ${index}` }));
  const { error } = await admin().from("companies").insert(names);
  expect(error).toBeNull();

  await openSession(page, owner);
  await dashboard(page);
  await expectStatuses(page, ["done", "todo", "todo", "done"]);
  await expect(step(page, 1)).toContainText("e altre 2.");
  await expect(step(page, 2)).toContainText("e altre 2.");
  // Le società senza brand sono solo un'informazione: il passo del brand resta fatto.
  await expect(step(page, 3)).toContainText("Società senza brand collegato:");
  await expect(page.getByText(/è completa/)).toHaveCount(0);
});

test("il consulente vede solo la frase, senza passi", async ({ page }) => {
  await openSession(page, consultant);
  await dashboard(page);
  await expect(page.getByTestId("setup-message")).toHaveText(
    "La configurazione iniziale la cura il titolare.",
  );
  await expect(steps(page)).toHaveCount(0);
});
