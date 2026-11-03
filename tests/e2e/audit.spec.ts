import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { Database } from "../../src/lib/supabase/database.types";
import { romeDay } from "../../src/lib/rome-day";
import { deleteTestBrands, deleteTestCompanies, runPrefix } from "./support/test-data";
import {
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Nome del profilo e registro delle modifiche, con dati inventati cancellati alla fine (solo
// sul progetto di prova). Le righe del registro restano, come sempre. Senza .env.local
// vengono saltati.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const companyName = `${mine} Registro Srl`;
const brandName = `${mine} Brand registro`;
const auditPath = "/impostazioni/registro-delle-modifiche";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let owner: TemporaryUser;
let consultant: TemporaryUser;
let companyUrl = "";
let brandUrl = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  owner = await createTemporaryUser("owner");
  consultant = await createTemporaryUser("sales_consultant");
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await deleteTestBrands({ prefix: mine });
  await deleteTestCompanies({ prefix: mine });
  await deleteTemporaryUser(owner);
  await deleteTemporaryUser(consultant);
});

async function openReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const rows = (page: Page) => page.getByTestId("audit-row");

test("il proprio nome: si salva, compare subito nel campo e nell'avatar", async ({ page }) => {
  await signIn(page, owner);
  await page.getByRole("button", { name: /Menu utente/ }).click();
  await page.getByRole("link", { name: "Il mio profilo" }).click();
  await page.waitForLoadState("networkidle");
  const name = page.getByLabel(/^Nome e cognome/);

  await name.fill("x".repeat(81));
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText("Il nome può avere al massimo 80 caratteri.")).toBeVisible();

  await name.fill("  Mario   Prova ");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Nome salvato.")).toBeVisible();
  await expect(name).toHaveValue("Mario Prova");
  await expect(page.getByRole("button", { name: "Menu utente: Mario Prova" })).toHaveText("MP");

  await page.reload();
  await expect(page.getByLabel(/^Nome e cognome/)).toHaveValue("Mario Prova");
});

test("il registro mostra chi e cosa in italiano, senza dati tecnici", async ({ page }) => {
  await signIn(page, owner);
  await openReady(page, "/impostazioni/societa-e-brand/societa/nuova");
  await page.getByLabel("Ragione sociale").fill(companyName);
  await page.getByRole("button", { name: "Crea società" }).click();
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible();
  companyUrl = new URL(page.url()).pathname;
  await page.waitForLoadState("networkidle");
  await page.getByLabel("IBAN").fill("IT60X0542811101000000123456");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(status(page, "Conto aggiunto.")).toBeVisible();

  await openReady(page, "/impostazioni/societa-e-brand/brand/nuovo");
  await page.getByLabel("Nome del brand").fill(brandName);
  await page.getByRole("button", { name: "Crea brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: brandName })).toBeVisible();
  brandUrl = new URL(page.url()).pathname;
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel(/^File del logo/)
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Carica logo" }).click();
  await expect(status(page, "Logo caricato.")).toBeVisible();
  await page.getByRole("checkbox", { name: companyName }).check();
  await page.getByRole("button", { name: "Salva collegamenti" }).click();
  await expect(status(page, "Collegamenti salvati.")).toBeVisible();

  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await menu.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await menu.getByRole("link", { name: "Registro delle modifiche" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Registro delle modifiche" }),
  ).toBeVisible();

  const list = page.getByTestId("audit-list");
  await expect(list).toContainText(`Mario Prova ha creato la società «${companyName}»`);
  await expect(list).toContainText(
    `Mario Prova ha aggiunto il conto IT60 … 3456 della società «${companyName}»`,
  );
  await expect(list).toContainText(`Mario Prova ha caricato il logo del brand «${brandName}»`);
  await expect(list).toContainText(
    `Mario Prova ha collegato il brand «${brandName}» alla società «${companyName}»`,
  );
  await expect(list).toContainText("Mario Prova ha cambiato il nome del proprio profilo");

  // Niente percorsi dei file, indirizzi firmati, identificativi o IBAN completi.
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(
    /brands\/|companies\/|token=|supabase\.co|\.png|[0-9a-f]{8}-[0-9a-f]{4}-/,
  );
  expect(text).not.toContain("0542811101");
  expect(text).not.toMatch(/legal_name|company_bank_accounts|is_active|creation_key/);
});

test("filtri per tipo di dato, persona e giornate in ora di Roma", async ({ page }) => {
  await signIn(page, owner);
  const today = romeDay(new Date());
  const tomorrow = new Date(Date.now() + 36 * 3_600_000);

  await openReady(page, `${auditPath}?tipo=brand&persona=${owner.id}`);
  await expect(rows(page).first()).toBeVisible();
  for (const row of await rows(page).allInnerTexts()) {
    expect(row).toContain("Mario Prova");
    expect(row).toContain("brand");
  }

  await openReady(page, auditPath);
  await page.getByLabel("Dal", { exact: true }).fill(today);
  await page.getByLabel("Al", { exact: true }).fill(today);
  await page.getByLabel("Persona", { exact: true }).selectOption(owner.id);
  await page.getByRole("button", { name: "Filtra" }).click();
  await expect(page.getByTestId("audit-list")).toContainText(
    `ha creato la società «${companyName}»`,
  );

  await openReady(page, `${auditPath}?dal=${romeDay(tomorrow)}&persona=${owner.id}`);
  await expect(page.getByText("Nessuna modifica con questi filtri.")).toBeVisible();
});

test("50 righe per pagina, poi «Modifiche precedenti» senza ripetizioni", async ({ page }) => {
  test.setTimeout(120_000);
  // 55 cambi di nome del brand fatti dal titolare, per avere più di una pagina.
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  await client.auth.signInWithPassword({ email: owner.email, password: owner.password });
  const brandId = brandUrl.split("/").at(-1)!;
  for (let index = 1; index <= 55; index++) {
    const { error } = await client
      .from("brands")
      .update({ name: `${brandName} ${index}` })
      .eq("id", brandId);
    expect(error).toBeNull();
  }
  await client.from("brands").update({ name: brandName }).eq("id", brandId);
  await client.auth.signOut();

  await signIn(page, owner);
  await openReady(page, `${auditPath}?tipo=brand&persona=${owner.id}`);
  await expect(rows(page)).toHaveCount(50);
  const firstPage = await rows(page).allInnerTexts();

  await page.getByRole("link", { name: "Modifiche precedenti →" }).click();
  await page.waitForURL(/dopo=/);
  await expect(page.getByRole("link", { name: "Torna alle più recenti" })).toBeVisible();
  const secondPage = await rows(page).allInnerTexts();
  expect(secondPage.length).toBeGreaterThanOrEqual(7);
  expect(new URL(page.url()).searchParams.get("dopo")).toMatch(/~\d+$/);
  // La prima riga della seconda pagina è più vecchia dell'ultima della prima.
  const times = await rows(page)
    .locator("time")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("datetime")));
  expect(firstPage).not.toContain(secondPage[0]);
  expect(times.length).toBe(secondPage.length);
  await page.getByRole("link", { name: "Torna alle più recenti" }).click();
  await expect(rows(page)).toHaveCount(50);
});

test("lo storico nella scheda della società porta al registro filtrato", async ({ page }) => {
  await signIn(page, owner);
  await openReady(page, companyUrl);
  const history = page.locator("section").filter({ hasText: "Storico delle modifiche" });
  await expect(history).toContainText(`ha creato la società «${companyName}»`);
  await expect(history).toContainText("ha aggiunto il conto IT60 … 3456");
  await history.getByRole("link", { name: "Vedi tutto nel registro" }).click();
  await expect(
    page.getByRole("heading", { name: `Modifiche riguardanti la società «${companyName}»` }),
  ).toBeVisible();
  for (const row of await rows(page).allInnerTexts()) expect(row).toContain(companyName);

  await openReady(page, brandUrl);
  const brandHistory = page.locator("section").filter({ hasText: "Storico delle modifiche" });
  // Le ultime 10 modifiche del brand sono i cambi di nome della prova precedente.
  await expect(brandHistory).toContainText(`ha modificato il brand «${brandName}»`);
  await expect(brandHistory.getByTestId("audit-row")).toHaveCount(10);
});

test("il consulente non apre il registro ma cambia il proprio nome", async ({ page }) => {
  await signIn(page, consultant);
  await page.goto(auditPath);
  await expect(page).toHaveURL("/?accesso=negato");

  await openReady(page, "/profilo");
  await page.getByLabel(/^Nome e cognome/).fill("Anna Prova");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(status(page, "Nome salvato.")).toBeVisible();
  // Il ruolo resta quello di prima.
  await expect(page.locator("main dd").filter({ hasText: "Consulente" })).toBeVisible();
});
