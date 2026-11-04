import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestCompanies, deleteTestCustomers, runPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Clienti con dati inventati, cancellati alla fine (solo sul progetto di prova). Senza
// .env.local vengono saltati.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const customerName = `${mine} Cliente Srl`;
const privateName = `${mine} Privato`;
const groupCompany = `${mine} Gruppo Srl`;
const users: Partial<
  Record<"owner" | "consultant" | "catalog" | "finance" | "manager", TemporaryUser>
> = {};
let customerUrl = "";
let privateUrl = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  users.owner = await createTemporaryUser("owner");
  users.consultant = await createTemporaryUser("sales_consultant");
  users.catalog = await createTemporaryUser("catalog_admin");
  users.finance = await createTemporaryUser("finance_admin");
  users.manager = await createTemporaryUser("sales_manager");
  const { data, error } = await admin()
    .from("companies")
    .insert({ legal_name: groupCompany })
    .select("id")
    .single();
  if (error) throw new Error(`Società di prova non creata: ${error.message}`);
  // Chi non è titolare vede solo le società a cui è collegato (decisione del 3 novembre).
  const link = await admin()
    .from("profile_companies")
    .insert({ user_id: users.finance.id, company_id: data.id });
  if (link.error) throw new Error(`Collegamento di prova non creato: ${link.error.message}`);
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  // Prima gli utenti (con i loro collegamenti alle società), poi clienti e società.
  for (const user of Object.values(users)) if (user) await deleteTemporaryUser(user);
  await deleteTestCustomers({ prefix: mine });
  await deleteTestCompanies({ prefix: mine });
});

async function openReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const completeness = (page: Page) => page.getByTestId("completeness");

test("si crea un cliente con il solo nome: risulta Incompleta e dice cosa manca", async ({
  page,
}) => {
  await signIn(page, users.owner!);
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await menu.getByRole("button", { name: "Clienti", exact: true }).click();
  await menu.getByRole("link", { name: "Elenco" }).click();
  await page.getByRole("link", { name: "Aggiungi cliente" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nome o ragione sociale").fill(`  ${customerName}  `);
  // Doppio clic: si crea un solo cliente.
  await page.getByRole("button", { name: "Crea cliente" }).dblclick();
  await expect(page.getByRole("heading", { level: 1, name: customerName })).toBeVisible();
  customerUrl = new URL(page.url()).pathname;
  const { data } = await admin().from("customers").select("id").eq("name", customerName);
  expect(data).toHaveLength(1);

  await expect(completeness(page)).toContainText(
    "Incompleta. Per la fatturazione mancano: tipo di soggetto, sede legale completa, regime IVA.",
  );
  // Nessun valore predefinito.
  await expect(page.getByLabel("Tipo di soggetto")).toHaveValue("");
  await expect(page.getByLabel("Regime IVA")).toHaveValue("");
  await expect(page.getByLabel("Split payment")).toHaveValue("");
  await expect(page.getByLabel("Nazione (codice a due lettere)")).toHaveValue("");
});

test("dati sbagliati rifiutati; completato diventa «Completa per fatturazione»", async ({
  page,
}) => {
  await signIn(page, users.owner!);
  await openReady(page, customerUrl);

  await page.getByLabel("Tipo di soggetto").selectOption("company");
  await page.getByLabel("Partita IVA").fill("01234567890");
  await page.getByRole("button", { name: "Italia" }).click();
  await page.getByLabel("CAP").fill("123");
  await page.getByLabel("PEC").fill("Fatture@PEC.Prova.test");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText(/^Partita IVA non valida/)).toBeVisible();
  await expect(page.getByText("Il CAP italiano ha 5 cifre.")).toBeVisible();
  // I valori scritti restano, anche nei menu a tendina.
  await expect(page.getByLabel("PEC")).toHaveValue("Fatture@PEC.Prova.test");
  await expect(page.getByLabel("Tipo di soggetto")).toHaveValue("company");
  await expect(page.getByLabel("Nazione (codice a due lettere)")).toHaveValue("IT");

  await page.getByLabel("Partita IVA").fill("01234567897");
  await page.getByLabel("Via e numero civico").fill("Via di Prova 1");
  await page.getByLabel("CAP").fill("00100");
  await page.getByLabel("Comune").fill("Comune di Prova");
  await page.getByLabel("Provincia").fill("rm");
  await page.getByLabel("Regime IVA").selectOption("ordinary");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Cliente salvato.")).toBeVisible();
  await expect(completeness(page)).toContainText("Completa per fatturazione.");

  // Dopo il salvataggio i campi mostrano i dati salvati, senza ricaricare.
  await expect(page.getByLabel("PEC")).toHaveValue("fatture@pec.prova.test");
  await expect(page.getByLabel("Provincia")).toHaveValue("RM");
  await expect(page.getByLabel("Tipo di soggetto")).toHaveValue("company");
  await expect(page.getByTestId("recipient-code")).toContainText("0000000");
  await page.reload();
  await expect(page.getByLabel("Provincia")).toHaveValue("RM");
  await expect(completeness(page)).toContainText("Completa per fatturazione.");
});

test("l'elenco mostra solo nome, tipo, comune e completezza; «da completare» filtra", async ({
  page,
}) => {
  const { error } = await admin()
    .from("customers")
    .insert({ name: privateName, subject_type: "private", tax_code: "RSSMRA85T10A562S" });
  expect(error).toBeNull();

  await signIn(page, users.owner!);
  await openReady(page, "/clienti");
  const row = page.getByTestId("customer-row").filter({ hasText: customerName });
  await expect(row).toContainText("Azienda");
  await expect(row).toContainText("Comune di Prova");
  await expect(row).toContainText("Completa per fatturazione");
  const table = await page.getByTestId("customers-table").innerText();
  expect(table).not.toMatch(/RSSMRA|01234567897|pec\.prova|Via di Prova/);

  await openReady(page, "/clienti/da-completare");
  await expect(page.getByRole("link", { name: privateName })).toBeVisible();
  await expect(page.getByRole("link", { name: customerName })).toHaveCount(0);
  await page.getByRole("link", { name: privateName }).click();
  await page.waitForURL(/\/clienti\/[0-9a-f-]{36}$/);
  privateUrl = new URL(page.url()).pathname;
});

test("il registro dice cosa è cambiato, senza i dati personali", async ({ page }) => {
  await signIn(page, users.owner!);
  await openReady(page, privateUrl);
  await page.getByLabel("Codice fiscale").fill("RSSMRA85T10A56NH");
  await page.getByLabel("PEC").fill("privato@pec.prova.test");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Cliente salvato.")).toBeVisible();

  const history = page.locator("section").filter({ hasText: "Storico delle modifiche" });
  await expect(history).toContainText(`ha modificato il cliente «${privateName}»`);
  await expect(history).toContainText("Codice fiscale: modificato");
  await expect(history).toContainText("PEC: modificato");
  const text = await history.innerText();
  expect(text).not.toMatch(/RSSMRA|privato@pec/);
});

test("consulente: vede e modifica, non disattiva né indica la società del gruppo", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openReady(page, "/clienti");
  await expect(page.getByRole("link", { name: customerName })).toBeVisible();
  await openReady(page, customerUrl);
  await expect(page.getByRole("heading", { name: "Disattiva il cliente" })).toHaveCount(0);
  await expect(page.getByLabel("Società del gruppo")).toHaveCount(0);
  await expect(page.getByText("Non è una società del gruppo.")).toBeVisible();
  // Il registro è una pagina del titolare: nella scheda non c'è lo storico.
  await expect(page.getByText("Storico delle modifiche")).toHaveCount(0);

  await page.getByLabel("Comune").fill("Altro Comune di Prova");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Cliente salvato.")).toBeVisible();
  await expect(page.getByLabel("Comune")).toHaveValue("Altro Comune di Prova");
});

test("amministrazione economica indica la società del gruppo", async ({ page }) => {
  await signIn(page, users.finance!);
  await openReady(page, customerUrl);
  await page.getByLabel("Società del gruppo").selectOption({ label: groupCompany });
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Cliente salvato.")).toBeVisible();
  await expect(page.getByLabel("Società del gruppo")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(page.getByText("Storico delle modifiche")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Società del gruppo").locator("option:checked")).toHaveText(
    groupCompany,
  );
});

test("responsabile commerciale disattiva e riattiva", async ({ page }) => {
  await signIn(page, users.manager!);
  await openReady(page, customerUrl);
  await page.getByRole("button", { name: "Disattiva", exact: true }).click();
  await expect(status(page, "Cliente disattivato.")).toBeVisible();
  await openReady(page, "/clienti");
  await expect(page.getByRole("link", { name: customerName })).toHaveCount(0);
  await page.getByRole("link", { name: /^Mostra i disattivati/ }).click();
  await page.getByRole("link", { name: customerName }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Riattiva", exact: true }).click();
  await expect(status(page, "Cliente riattivato.")).toBeVisible();
});

test("l'amministrazione cataloghi non apre i clienti", async ({ page }) => {
  await signIn(page, users.catalog!);
  for (const path of ["/clienti", customerUrl, "/clienti/nuovo"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL("/?accesso=negato");
  }
  await expect(
    page
      .getByRole("navigation", { name: "Menu principale" })
      .getByRole("button", { name: "Clienti" }),
  ).toHaveCount(0);
});
