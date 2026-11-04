import { expect, test, type Locator, type Page } from "@playwright/test";
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

// Referenti, indirizzi di consegna e ricerca per email, con dati inventati cancellati alla fine
// (solo sul progetto di prova). Senza .env.local vengono saltati.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const customerName = `${mine} Referenti Srl`;
// Parte dell'email unica per questa esecuzione, per la ricerca.
const mailbox = `uff${randomUUID().slice(0, 8)}`;
const users: Partial<Record<"owner" | "consultant" | "manager" | "busy", TemporaryUser>> = {};
let customerUrl = "";
let customerId = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  users.owner = await createTemporaryUser("owner");
  users.consultant = await createTemporaryUser("sales_consultant");
  users.manager = await createTemporaryUser("sales_manager");
  // Usata solo per superare il limite delle ricerche nell'elenco (resta bloccata un minuto).
  users.busy = await createTemporaryUser("sales_consultant");
  const { data, error } = await admin()
    .from("customers")
    .insert({ name: customerName, address_city: "Comune di Prova" })
    .select("id")
    .single();
  if (error) throw new Error(`Cliente di prova non creato: ${error.message}`);
  customerId = data.id;
  customerUrl = `/clienti/${data.id}`;
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  for (const user of Object.values(users)) if (user) await deleteTemporaryUser(user);
  await deleteTestCustomers({ prefix: mine });
});

async function openReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const status = (scope: Page | Locator, text: string) =>
  scope.getByRole("status").filter({ hasText: text });
const contacts = (page: Page) => page.getByTestId("customer-contacts");
const addresses = (page: Page) => page.getByTestId("customer-addresses");
const contactRow = (page: Page, name: string) =>
  contacts(page).getByTestId("contact").filter({ hasText: name });
const addressRow = (page: Page, text: string) =>
  addresses(page).getByTestId("address").filter({ hasText: text });

test("consulente: aggiunge referenti; il primo è principale; email e telefono controllati", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openReady(page, customerUrl);
  const card = contacts(page);
  await expect(card).toContainText("Nessun referente.");

  await card.getByRole("button", { name: "Aggiungi un referente" }).click();
  await card.getByLabel("Nome", { exact: true }).fill("Anna Inventata");
  await card.getByLabel("Email (facoltativa)").fill("anna@senzapunto");
  await card.getByLabel("Telefono (facoltativo)").fill("12-345");
  await card.getByRole("button", { name: "Aggiungi referente" }).click();
  await expect(card.getByText("Email non valida.")).toBeVisible();
  await expect(card.getByText(/^Telefono non valido/)).toBeVisible();
  // I valori scritti restano dopo l'errore.
  await expect(card.getByLabel("Nome", { exact: true })).toHaveValue("Anna Inventata");

  await card.getByLabel("Email (facoltativa)").fill(` Anna@${mailbox}.Prova.test `);
  await card.getByLabel("Telefono (facoltativo)").fill("+39 (02) 1234-5678");
  await card.getByLabel("Ruolo (facoltativo)").fill("Acquisti");
  // Doppio clic: un solo referente.
  await card.getByRole("button", { name: "Aggiungi referente" }).dblclick();
  await expect(status(card, "Referente aggiunto.")).toBeVisible();
  // Il modulo si svuota per il prossimo referente.
  await expect(card.getByLabel("Nome", { exact: true })).toHaveValue("");
  const { data } = await admin()
    .from("customer_contacts")
    .select("id")
    .eq("customer_id", customerId);
  expect(data).toHaveLength(1);

  const anna = contactRow(page, "Anna Inventata");
  await expect(anna).toContainText("Principale");
  await expect(anna).toContainText(`anna@${mailbox}.prova.test`);
  await expect(anna).toContainText("+39 (02) 1234-5678");

  await card.getByLabel("Nome", { exact: true }).fill("Bruno Inventato");
  await card.getByRole("button", { name: "Aggiungi referente" }).click();
  await expect(contactRow(page, "Bruno Inventato")).toBeVisible();
  await expect(contactRow(page, "Bruno Inventato")).not.toContainText("Principale");

  // La consulente sceglie il principale ma non disattiva.
  await contactRow(page, "Bruno Inventato")
    .getByRole("button", { name: "Rendi principale" })
    .click();
  await expect(status(card, "Referente principale aggiornato.")).toBeVisible();
  await expect(contactRow(page, "Bruno Inventato")).toContainText("Principale");
  await expect(contactRow(page, "Anna Inventata")).not.toContainText("Principale");
  await expect(card.getByRole("button", { name: "Disattiva" })).toHaveCount(0);
});

test("modifica di un referente: i campi mostrano i dati salvati, anche dopo aver ricaricato", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openReady(page, customerUrl);
  const row = contactRow(page, "Anna Inventata");
  await row.getByRole("button", { name: "Modifica" }).click();
  await row.getByLabel("Email (facoltativa)").fill(`  ANNA.NUOVA@${mailbox}.PROVA.TEST `);
  await row.getByLabel("Ruolo (facoltativo)").fill("  Amministrazione   ");
  await row.getByRole("button", { name: "Salva referente" }).click();
  await expect(status(row, "Referente salvato.")).toBeVisible();
  // Senza ricaricare: i valori normalizzati, come nel database.
  await expect(row.getByLabel("Email (facoltativa)")).toHaveValue(
    `anna.nuova@${mailbox}.prova.test`,
  );
  await expect(row.getByLabel("Ruolo (facoltativo)")).toHaveValue("Amministrazione");

  await page.reload();
  await page.waitForLoadState("networkidle");
  const again = contactRow(page, "Anna Inventata");
  await expect(again).toContainText(`anna.nuova@${mailbox}.prova.test`);
  await again.getByRole("button", { name: "Modifica" }).click();
  await expect(again.getByLabel("Ruolo (facoltativo)")).toHaveValue("Amministrazione");
});

test("indirizzi: via, comune e paese obbligatori; paese con un clic; predefinito", async ({
  page,
}) => {
  await signIn(page, users.consultant!);
  await openReady(page, customerUrl);
  const card = addresses(page);
  await card.getByRole("button", { name: "Aggiungi un indirizzo di consegna" }).click();
  // Nessun paese precompilato.
  await expect(card.getByLabel("Paese (codice a due lettere)")).toHaveValue("");
  await card.getByLabel("Via e numero civico").fill("Via Inventata 1");
  await card.getByLabel("Comune").fill("Comune di Prova");
  await card.getByLabel("CAP").fill("123");
  // Il paese è obbligatorio anche nel browser: si toglie il controllo per provare il server.
  await card
    .getByLabel("Paese (codice a due lettere)")
    .evaluate((input) => input.removeAttribute("required"));
  await card.getByRole("button", { name: "Aggiungi indirizzo" }).click();
  await expect(card.getByText(/^Scegli il paese/)).toBeVisible();

  await card.getByRole("button", { name: "Italia" }).click();
  await card.getByRole("button", { name: "Aggiungi indirizzo" }).click();
  await expect(card.getByText("Il CAP italiano ha 5 cifre.")).toBeVisible();
  await expect(card.getByLabel("Paese (codice a due lettere)")).toHaveValue("IT");

  await card.getByLabel("CAP").fill("00100");
  await card.getByLabel("Provincia").fill("rm");
  await card.getByLabel("Descrizione (facoltativa, per esempio «Magazzino»)").fill("Magazzino");
  await card.getByRole("button", { name: "Aggiungi indirizzo" }).dblclick();
  await expect(status(card, "Indirizzo aggiunto.")).toBeVisible();
  const first = addressRow(page, "Via Inventata 1");
  await expect(first).toContainText("Predefinito");
  await expect(first).toContainText("Via Inventata 1, 00100 Comune di Prova (RM), Italia");

  await card.getByLabel("Via e numero civico").fill("Rue Inventée 4");
  await card.getByLabel("Comune").fill("Ville de Test");
  await card.getByLabel("CAP").fill("F-75001");
  await card.getByLabel("Paese (codice a due lettere)").fill("fr");
  await card.getByRole("button", { name: "Aggiungi indirizzo" }).click();
  const second = addressRow(page, "Rue Inventée 4");
  await expect(second).toContainText("Francia");
  await second.getByRole("button", { name: "Rendi predefinito" }).click();
  await expect(status(card, "Indirizzo predefinito aggiornato.")).toBeVisible();
  await expect(second).toContainText("Predefinito");

  // Modifica: dati salvati senza ricaricare e dopo aver ricaricato.
  await first.getByRole("button", { name: "Modifica" }).click();
  await first.getByLabel("Provincia").fill(" mi ");
  await first.getByLabel("CAP").fill("20100");
  await first.getByRole("button", { name: "Salva indirizzo" }).click();
  await expect(status(first, "Indirizzo salvato.")).toBeVisible();
  await expect(first.getByLabel("Provincia")).toHaveValue("MI");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(addressRow(page, "Via Inventata 1")).toContainText("20100 Comune di Prova (MI)");
  const { data } = await admin()
    .from("customer_delivery_addresses")
    .select("id")
    .eq("customer_id", customerId);
  expect(data).toHaveLength(2);
});

test("responsabile commerciale: disattiva e riattiva, il principale solo dopo averne scelto un altro", async ({
  page,
}) => {
  await signIn(page, users.manager!);
  await openReady(page, customerUrl);
  const card = contacts(page);
  await contactRow(page, "Bruno Inventato").getByRole("button", { name: "Disattiva" }).click();
  await expect(card.getByText("Scegli prima un altro referente principale.")).toBeVisible();

  await contactRow(page, "Anna Inventata").getByRole("button", { name: "Disattiva" }).click();
  await expect(status(card, "Referente disattivato.")).toBeVisible();
  await card.getByText("Disattivati (1)").click();
  const anna = contactRow(page, "Anna Inventata");
  await expect(anna).toContainText("Disattivato");
  await anna.getByRole("button", { name: "Riattiva" }).click();
  await expect(status(card, "Referente riattivato.")).toBeVisible();
  await expect(card.getByText("Disattivati (1)")).toHaveCount(0);

  const old = addressRow(page, "Via Inventata 1");
  await old.getByRole("button", { name: "Disattiva" }).click();
  await expect(status(addresses(page), "Indirizzo disattivato.")).toBeVisible();
  await expect(addresses(page).getByText("Disattivati (1)")).toBeVisible();
});

test("elenco: ricerca per parte dell'email, solo referenti attivi, senza mostrarne i dati", async ({
  page,
}) => {
  await signIn(page, users.owner!);
  await openReady(page, "/clienti");
  const search = page.getByRole("searchbox", { name: /^Cerca per nome/ });
  const table = page.getByTestId("customers-table");

  await search.fill(`${mailbox}.PROVA`);
  await page.getByRole("button", { name: "Cerca" }).click();
  await page.waitForURL(/cerca=/);
  await expect(page.getByRole("link", { name: customerName })).toBeVisible();
  expect(await table.innerText()).not.toMatch(/anna|bruno|@|1234|Via Inventata/i);

  // L'email di un referente disattivato non conta più.
  const { error } = await admin()
    .from("customer_contacts")
    .update({ is_active: false, is_primary: false })
    .eq("customer_id", customerId)
    .eq("name", "Anna Inventata");
  expect(error).toBeNull();
  await page.getByRole("button", { name: "Cerca" }).click();
  await expect(page.getByText("Nessun cliente trovato con questa ricerca.")).toBeVisible();

  await search.fill("ab");
  await page.getByRole("button", { name: "Cerca" }).click();
  await expect(page.getByTestId("search-error")).toHaveText(
    "Scrivi almeno 3 caratteri per cercare.",
  );
});

test("registro e storico: referenti e indirizzi senza nomi, email, telefoni o vie", async ({
  page,
}) => {
  const { data, error } = await admin()
    .from("audit_log")
    .select("old_data, new_data")
    .in("table_name", ["customer_contacts", "customer_delivery_addresses"])
    .or(`new_data->>customer_id.eq.${customerId},old_data->>customer_id.eq.${customerId}`);
  expect(error).toBeNull();
  expect(data!.length).toBeGreaterThan(5);
  expect(JSON.stringify(data)).not.toMatch(/anna|bruno|@|\(02\)|Inventata 1|Inventée|Magazzino/i);

  await signIn(page, users.owner!);
  await openReady(page, customerUrl);
  const history = page.locator("section").filter({ hasText: "Storico delle modifiche" });
  // Lo storico mostra le ultime 10 modifiche: le più recenti sono di questi passi.
  await expect(history).toContainText(`ha riattivato un referente del cliente «${customerName}»`);
  await expect(history).toContainText(
    `ha disattivato un indirizzo di consegna del cliente «${customerName}»`,
  );
  // Gli autori possono comparire con la loro email: si controllano solo i dati del cliente.
  expect(await history.innerText()).not.toMatch(/anna|bruno|\(02\)|Inventata 1|Magazzino/i);
});

test("più di 50 risultati: i primi 50 per nome e l'invito ad affinare la ricerca", async ({
  page,
}) => {
  const batch = Array.from({ length: 52 }, (_, index) => ({
    name: `${mine} Lotto ${String(index + 1).padStart(2, "0")}`,
  }));
  const { error } = await admin().from("customers").insert(batch);
  expect(error).toBeNull();

  await signIn(page, users.owner!);
  await openReady(page, `/clienti?cerca=${encodeURIComponent(`${mine} Lotto`)}`);
  await expect(page.getByTestId("customer-row")).toHaveCount(50);
  await expect(page.getByTestId("customer-row").first()).toContainText(`${mine} Lotto 01`);
  await expect(page.getByTestId("search-more")).toHaveText(
    "Ci sono altri risultati: affina la ricerca.",
  );

  await openReady(page, `/clienti?cerca=${encodeURIComponent(`${mine} Lotto 0`)}`);
  await expect(page.getByTestId("customer-row")).toHaveCount(9);
  await expect(page.getByTestId("search-more")).toHaveCount(0);
});

test("oltre il limite delle ricerche nell'elenco: messaggio gentile", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, users.busy!);
  for (let search = 1; search <= 20; search++) {
    await page.goto(`/clienti?cerca=${encodeURIComponent(`${mine} ricerca ${search}`)}`);
  }
  await openReady(page, `/clienti?cerca=${encodeURIComponent(`${mine} ancora`)}`);
  await expect(page.getByTestId("search-error")).toHaveText(
    "Troppe ricerche ravvicinate, riprova tra un minuto.",
  );
  // La pagina resta usabile: senza ricerca l'elenco si apre.
  await page.getByRole("link", { name: "Azzera" }).click();
  await expect(page.getByTestId("search-error")).toHaveCount(0);
});
