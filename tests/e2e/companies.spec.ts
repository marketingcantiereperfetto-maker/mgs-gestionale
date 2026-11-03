import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestCompanies, testPrefix } from "./support/test-data";
import {
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteLeftoverTemporaryUsers,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Traguardo del giorno 5 con dati inventati, cancellati alla fine: la prima società con un
// IBAN, i controlli sui dati e le regole dei conti. Senza .env.local vengono saltati.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

let owner: TemporaryUser;
let consultant: TemporaryUser;
const companyName = `${testPrefix} ${randomUUID().slice(0, 8)} Srl`;
let companyUrl = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  await deleteLeftoverTemporaryUsers();
  await deleteTestCompanies();
  owner = await createTemporaryUser("owner");
  consultant = await createTemporaryUser("sales_consultant");
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await deleteTestCompanies();
  await deleteTemporaryUser(owner);
  await deleteTemporaryUser(consultant);
});

const alert = (page: Page, text: string | RegExp) =>
  page.getByRole("alert").filter({ hasText: text });

test("il titolare crea una società con la sola ragione sociale", async ({ page }) => {
  await signIn(page, owner);
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await menu.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await menu.getByRole("link", { name: "Società e brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Società e brand" })).toBeVisible();

  await page.getByRole("link", { name: "Aggiungi società" }).click();
  await page.getByRole("button", { name: "Crea società" }).click();
  // Il browser blocca l'invio a campo vuoto: la ragione sociale è obbligatoria.
  await expect(page).toHaveURL(/\/societa\/nuova$/);

  await page.getByLabel("Ragione sociale").fill(companyName);
  await page.getByRole("button", { name: "Crea società" }).click();
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible();
  companyUrl = new URL(page.url()).pathname;
  await expect(page.getByTestId("readiness")).toContainText(
    "mancano: partita IVA, codice fiscale, sede legale completa, email",
  );
  await expect(page.getByTestId("readiness")).toContainText("l'IBAN serve se usi il bonifico");
});

test("i dati sbagliati vengono rifiutati, quelli giusti salvati", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(companyUrl);

  await page.getByLabel("Partita IVA").fill("01234567890");
  await page.getByLabel("Codice fiscale").fill("RSSMRA85T10A562T");
  await page.getByLabel("Email").fill("amministrazione@prova.test");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText(/^Partita IVA non valida/)).toBeVisible();
  await expect(page.getByText(/^Codice fiscale non valido/)).toBeVisible();
  // Dopo l'errore i valori scritti restano nel modulo.
  await expect(page.getByLabel("Email")).toHaveValue("amministrazione@prova.test");

  await page.getByLabel("Partita IVA").fill("01234567897");
  await page.getByLabel("Codice fiscale").fill("01234567897");
  await page.getByLabel("Via e numero civico").fill("Via di Prova 1");
  await page.getByLabel("CAP").fill("00100");
  await page.getByLabel("Comune").fill("Comune di Prova");
  await page.getByLabel("Provincia").fill("RM");
  // Il paese parte vuoto e si sceglie con un clic.
  await expect(page.getByLabel("Paese (codice a due lettere)")).toHaveValue("");
  await page.getByRole("button", { name: "Italia" }).click();
  await expect(page.getByLabel("Paese (codice a due lettere)")).toHaveValue("IT");
  await page.getByRole("button", { name: "Salva" }).click();

  await expect(page.getByText("Dati salvati.")).toBeVisible();
  await expect(page.getByText("Pronta per emettere preventivi.")).toBeVisible();
});

test("conti: IBAN controllato, primo predefinito, il predefinito non si disattiva", async ({
  page,
}) => {
  await signIn(page, owner);
  await page.goto(companyUrl);
  const accounts = page.getByTestId("bank-account");

  await page.getByLabel("IBAN").fill("IT61 X054 2811 1010 0000 0123 456");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(page.getByText("IBAN non valido: controlla le cifre.")).toBeVisible();

  await page.getByLabel("IBAN").fill("it60 x054 2811 1010 0000 0123 456");
  await page.getByLabel(/^Descrizione/).fill("Banca inventata");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(accounts).toHaveCount(1);
  await expect(accounts.first()).toContainText("IT60 X054 2811 1010 0000 0123 456");
  await expect(accounts.first()).toContainText("Predefinito");
  await expect(page.getByText("l'IBAN serve se usi il bonifico")).toHaveCount(0);

  await page.getByLabel("IBAN").fill("DE89370400440532013000");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(accounts).toHaveCount(2);
  const second = accounts.filter({ hasText: "DE89" });
  await expect(second).not.toContainText("Predefinito");

  await second.getByRole("button", { name: "Rendi predefinito" }).click();
  await expect(second).toContainText("Predefinito");
  const defaultBadge = page.getByText("Predefinito", { exact: true });
  await expect(accounts.filter({ has: defaultBadge })).toHaveCount(1);

  await second.getByRole("button", { name: "Disattiva" }).click();
  await expect(alert(page, "Scegli prima un altro conto predefinito.")).toBeVisible();

  const first = accounts.filter({ hasText: "IT60" });
  await first.getByRole("button", { name: "Disattiva" }).click();
  await expect(accounts).toHaveCount(1);
  await page.getByRole("link", { name: "Mostra i disattivati (1)" }).click();
  await expect(
    accounts.filter({ has: page.getByText("Disattivato", { exact: true }) }),
  ).toHaveCount(1);
});

test("la società disattivata sparisce dall'elenco e si può riattivare", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(companyUrl);
  await page.getByRole("button", { name: "Disattiva", exact: true }).last().click();
  await expect(page.getByText("Disattivata", { exact: true })).toBeVisible();

  await page.goto("/impostazioni/societa-e-brand");
  await expect(page.getByRole("link", { name: companyName })).toHaveCount(0);
  await page.getByRole("link", { name: /^Mostra le disattivate/ }).click();
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();

  await page.getByRole("link", { name: companyName }).click();
  await page.getByRole("button", { name: "Riattiva", exact: true }).last().click();
  await expect(page.getByText("Disattivata", { exact: true })).toHaveCount(0);
  await page.goto("/impostazioni/societa-e-brand");
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();
});

test("il consulente non apre società e brand, neanche dall'indirizzo", async ({ page }) => {
  await signIn(page, consultant);
  for (const href of [
    "/impostazioni/societa-e-brand",
    companyUrl,
    "/impostazioni/societa-e-brand/societa/nuova",
  ]) {
    await page.goto(href);
    await expect(page, href).toHaveURL("/?accesso=negato");
  }
});
