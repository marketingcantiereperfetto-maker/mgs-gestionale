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
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Aggiungi cliente" }).click();
  await expect(page.getByRole("dialog", { name: "Aggiungi cliente" })).toBeVisible();
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

test("consulente: ricerca per nome, partita IVA, codice fiscale e PEC", async ({ page }) => {
  await signIn(page, users.consultant!);
  await openReady(page, "/clienti");
  const search = page.getByRole("searchbox", { name: /^Cerca per nome/ });
  const table = page.getByTestId("customers-table");

  for (const [term, expected] of [
    ["0123456789", customerName],
    ["rssmra85t10a56nh", privateName],
    ["privato@pec.prova.test", privateName],
    [mine.slice(-8), customerName],
  ] as const) {
    await search.fill(term);
    await page.getByRole("button", { name: "Cerca" }).click();
    await page.waitForURL(/cerca=/);
    await expect(page.getByRole("link", { name: expected })).toBeVisible();
    // I risultati mostrano solo nome, tipo, comune e completezza.
    expect(await table.innerText()).not.toMatch(/RSSMRA|01234567897|pec\.prova|Via di Prova/);
  }

  await search.fill(`${mine} nessuno così`);
  await page.getByRole("button", { name: "Cerca" }).click();
  await expect(page.getByText("Nessun cliente trovato con questa ricerca.")).toBeVisible();
  await page.getByRole("link", { name: "Azzera" }).click();
  await expect(page.getByRole("link", { name: customerName })).toBeVisible();
});

test("consulente: la scheda dice chi ha creato e chi ha modificato per ultimo", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openReady(page, privateUrl);
  // Il cliente privato l'ha inserito la procedura di prova, senza un utente.
  await expect(page.getByTestId("customer-authors")).toContainText(
    "Creato da Procedura di manutenzione il",
  );

  await openReady(page, customerUrl);
  const authors = page.getByTestId("customer-authors");
  await expect(authors).toContainText(/Creato da Prova owner il \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
  await expect(authors).toContainText("Ultima modifica di Prova sales_manager il");

  await page.getByLabel("Comune").fill("Comune di Prova");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Cliente salvato.")).toBeVisible();
  await expect(authors).toContainText("Ultima modifica di Prova sales_consultant il");
  // Della persona compare solo il nome, nient'altro del profilo.
  expect(await authors.innerText()).not.toMatch(/@prova\.test|Consulente|Titolare/);
});

const dialog = (page: Page) => page.getByRole("dialog", { name: "Aggiungi cliente" });

async function openDialog(page: Page) {
  await openReady(page, "/clienti");
  await page.getByRole("button", { name: "Aggiungi cliente" }).click();
  await expect(dialog(page)).toBeVisible();
}

test("finestra «Aggiungi cliente»: focus dentro, Esc chiude, il focus torna al pulsante", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openDialog(page);
  await expect(dialog(page).getByLabel("Nome o ragione sociale")).toBeFocused();
  for (let tab = 0; tab < 40; tab++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(
      () => document.activeElement === document.body || !!document.activeElement?.closest("dialog"),
    );
    expect(inside, `tasto Tab n. ${tab + 1}`).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "Aggiungi cliente" })).toBeFocused();
});

test("clienti simili mentre si scrive, con solo nome e comune; «Usa questo cliente»", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openDialog(page);
  await dialog(page).getByLabel("Nome o ragione sociale").fill(customerName.replace(" Srl", ""));
  const similar = dialog(page).getByTestId("similar-customers");
  const item = similar.getByRole("listitem").filter({ hasText: customerName });
  await expect(item).toContainText("nome simile");
  // Il comune è quello rimesso dal consulente nella prova precedente.
  await expect(item).toContainText("· Comune di Prova");
  expect(await similar.innerText()).not.toMatch(/01234567897|RSSMRA|pec\.prova|Via di Prova/);

  await dialog(page).getByLabel("Partita IVA").fill("01234567897");
  await expect(
    similar.getByRole("listitem").filter({ hasText: "stessa partita IVA" }),
  ).toContainText(customerName);

  await item.getByRole("button", { name: "Usa questo cliente" }).first().click();
  await page.waitForURL(customerUrl);
  await expect(page.getByRole("heading", { level: 1, name: customerName })).toBeVisible();
});

test("partita IVA identica: serve «È un cliente diverso», senza codici nei messaggi", async ({
  page,
}) => {
  const name = `${mine} Stessa IVA Srl`;
  await signIn(page, users.consultant!);
  await openDialog(page);
  await dialog(page).getByLabel("Nome o ragione sociale").fill(name);
  await dialog(page).getByLabel("Partita IVA").fill("01234567897");
  await dialog(page).getByRole("button", { name: "Crea cliente" }).click();
  const warning = dialog(page).getByRole("alert").filter({ hasText: "Esiste già un cliente" });
  await expect(warning).toContainText(
    `Esiste già un cliente con questa partita IVA: «${customerName}» (Comune di Prova).`,
  );
  expect(await warning.innerText()).not.toContain("01234567897");
  const { data: none } = await admin().from("customers").select("id").eq("name", name);
  expect(none).toEqual([]);

  // I valori scritti restano; con la casella il cliente si crea e si apre la sua scheda.
  await expect(dialog(page).getByLabel("Partita IVA")).toHaveValue("01234567897");
  await dialog(page).getByLabel("È un cliente diverso").check();
  await dialog(page).getByRole("button", { name: "Crea cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const { data } = await admin().from("customers").select("id").eq("name", name);
  expect(data).toHaveLength(1);
});

test("stesso codice fiscale e stesso codice ufficio PA: bloccato anche con la casella", async ({
  page,
}) => {
  const { error } = await admin()
    .from("customers")
    .insert({
      name: `${mine} Comune Inventato`,
      tax_code: "80000000002",
      pa_office_code: "UFPR01",
    });
  expect(error).toBeNull();

  await signIn(page, users.consultant!);
  await openDialog(page);
  await dialog(page).getByLabel("Nome o ragione sociale").fill(`${mine} Ufficio Doppio`);
  await dialog(page).getByLabel("Codice fiscale").fill("80000000002");
  await dialog(page).getByLabel("Codice univoco ufficio (6 caratteri)").fill("ufpr01");
  await dialog(page).getByRole("button", { name: "Crea cliente" }).click();
  const block = dialog(page)
    .getByRole("alert")
    .filter({ hasText: "Non si può salvare un doppione." });
  await expect(block).toContainText("con questo codice fiscale e lo stesso codice ufficio");
  expect(await block.innerText()).not.toContain("80000000002");
  await expect(dialog(page).getByLabel("È un cliente diverso")).toHaveCount(0);
});

test("le stesse regole valgono nella scheda", async ({ page }) => {
  await signIn(page, users.consultant!);
  await openReady(page, privateUrl);
  await page.getByLabel("Partita IVA").fill("01234567897");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Esiste già un cliente con questa partita IVA" }),
  ).toBeVisible();
  await expect(page.getByLabel("È un cliente diverso")).toBeVisible();
});

test("clienti disattivati nei suggerimenti: «Riattiva» solo per chi può", async ({ page }) => {
  const name = `${mine} Disattivato Snc`;
  const { error } = await admin().from("customers").insert({ name, is_active: false });
  expect(error).toBeNull();

  await signIn(page, users.consultant!);
  await openDialog(page);
  await dialog(page).getByLabel("Nome o ragione sociale").fill(name);
  const item = dialog(page)
    .getByTestId("similar-customers")
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(item).toContainText("Disattivato");
  await expect(item).toContainText("Cliente disattivato: chiedi a un responsabile");
  await expect(item.getByRole("button")).toHaveCount(0);

  // Si esce dal consulente e si entra come responsabile commerciale.
  await page.context().clearCookies();
  await signIn(page, users.manager!);
  await openDialog(page);
  await dialog(page).getByLabel("Nome o ragione sociale").fill(name);
  const managerItem = dialog(page)
    .getByTestId("similar-customers")
    .getByRole("listitem")
    .filter({ hasText: name });
  await managerItem.getByRole("button", { name: "Riattiva" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Disattivato", { exact: true })).toHaveCount(0);
});

test("la pagina «Nuovo cliente» usa lo stesso modulo", async ({ page }) => {
  const name = `${mine} Dalla Pagina`;
  await signIn(page, users.consultant!);
  await openReady(page, "/clienti/nuovo");
  await page.getByLabel("Nome o ragione sociale").fill(name);
  await page.getByRole("button", { name: "Crea cliente" }).dblclick();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const { data } = await admin().from("customers").select("id").eq("name", name);
  expect(data).toHaveLength(1);
});
