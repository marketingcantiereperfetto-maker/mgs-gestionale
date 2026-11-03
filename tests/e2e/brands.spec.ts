import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { deleteTestBrands, deleteTestCompanies, testPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteLeftoverTemporaryUsers,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Brand, loghi e collegamenti con dati inventati, cancellati alla fine (solo sul progetto di
// prova). Senza .env.local vengono saltati.
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const run = randomUUID().slice(0, 8);
const brandName = `${testPrefix} Brand ${run}`;
const companyName = `${testPrefix} Società brand ${run} Srl`;
// Immagine PNG vera di 1×1 pixel.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let owner: TemporaryUser;
let consultant: TemporaryUser;
let brandUrl = "";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  await deleteLeftoverTemporaryUsers();
  await deleteTestBrands();
  await deleteTestCompanies();
  owner = await createTemporaryUser("owner");
  consultant = await createTemporaryUser("sales_consultant");
  const { error } = await admin().from("companies").insert({ legal_name: companyName });
  if (error) throw new Error(`Società di prova non creata: ${error.message}`);
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await deleteTestBrands();
  await deleteTestCompanies();
  await deleteTemporaryUser(owner);
  await deleteTemporaryUser(consultant);
});

const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const alert = (page: Page, text: string) => page.getByRole("alert").filter({ hasText: text });

async function brandRow() {
  const { data } = await admin()
    .from("brands")
    .select("id, logo_path")
    .eq("name", brandName)
    .single();
  return data!;
}

test("doppio clic su «Crea brand»: un solo brand; il nome non si ripete", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/impostazioni/societa-e-brand");
  await page.getByRole("link", { name: "Aggiungi brand" }).click();
  await page.getByLabel("Nome del brand").fill(brandName);
  await page.getByRole("button", { name: "Crea brand" }).dblclick();
  await expect(page.getByRole("heading", { level: 1, name: brandName })).toBeVisible();
  brandUrl = new URL(page.url()).pathname;
  const { data } = await admin().from("brands").select("id").eq("name", brandName);
  expect(data).toHaveLength(1);

  await page.goto("/impostazioni/societa-e-brand/brand/nuovo");
  await page.getByLabel("Nome del brand").fill(`  ${brandName.toUpperCase()}  `);
  await page.getByRole("button", { name: "Crea brand" }).click();
  await expect(alert(page, "Esiste già un brand con questo nome")).toBeVisible();
});

test("logo: un'immagine vera si carica con un nome scelto dal server", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(brandUrl);
  await page.getByLabel(/^File del logo/).setInputFiles({
    name: "mio-logo-personale.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Carica logo" }).click();
  await expect(status(page, "Logo caricato.")).toBeVisible();

  const preview = page.getByTestId("logo-preview");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

  const { logo_path: path } = await brandRow();
  expect(path).toMatch(/^brands\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
  expect(path).not.toContain("mio-logo");

  // Indirizzo firmato che scade dopo 5 minuti.
  const src = (await preview.getAttribute("src"))!;
  const token = new URL(src).searchParams.get("token")!;
  const claims = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as {
    exp: number;
    iat: number;
  };
  expect(claims.exp - claims.iat).toBe(300);
});

test("logo: file finto, troppo grande o vuoto vengono rifiutati", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(brandUrl);
  const file = page.getByLabel(/^File del logo/);
  const send = page.getByRole("button", { name: "Sostituisci logo" });

  // Testo travestito da PNG: nome e tipo dichiarato non bastano.
  await file.setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from("non sono un'immagine"),
  });
  await send.click();
  await expect(alert(page, "Il file non è un'immagine PNG, JPEG o WebP.")).toBeVisible();

  const big = Buffer.concat([png, Buffer.alloc(1024 * 1024)]);
  await file.setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: big });
  await send.click();
  await expect(alert(page, "Il logo supera 1 MB")).toBeVisible();
});

test("l'indirizzo firmato non finisce nel registro", async () => {
  const { id } = await brandRow();
  const { data } = await admin().from("audit_log").select("old_data, new_data").eq("record_id", id);
  const text = JSON.stringify(data);
  expect(text).toContain("logo_path");
  expect(text).not.toMatch(/token=|\/sign\//);
});

test("chi non è titolare non legge il logo con l'indirizzo non firmato", async ({ request }) => {
  const { logo_path: path } = await brandRow();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: consultant.email,
    password: consultant.password,
  });
  expect(error).toBeNull();
  const headers = { apikey: key, Authorization: `Bearer ${data.session!.access_token}` };

  const asConsultant = await request.get(`${url}/storage/v1/object/authenticated/logos/${path}`, {
    headers,
  });
  expect(asConsultant.ok()).toBe(false);
  const direct = await request.get(`${url}/storage/v1/object/logos/${path}`, { headers });
  expect(direct.ok()).toBe(false);
  const anonymous = await request.get(`${url}/storage/v1/object/public/logos/${path}`);
  expect(anonymous.ok()).toBe(false);
  await client.auth.signOut();
});

test("collegamenti: spunta e tolta, con l'avviso senza blocco", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(brandUrl);
  await expect(page.getByText("Questo brand non è collegato a nessuna società.")).toBeVisible();

  const box = page.getByRole("checkbox", { name: companyName });
  await box.check();
  await page.getByRole("button", { name: "Salva collegamenti" }).click();
  await expect(status(page, "Collegamenti salvati.")).toBeVisible();

  await page.goto("/impostazioni/societa-e-brand");
  await page.getByRole("link", { name: companyName }).click();
  await expect(page.getByRole("link", { name: brandName })).toBeVisible();

  await page.goto(brandUrl);
  await page.getByRole("checkbox", { name: companyName }).uncheck();
  await expect(page.getByText("Salvando, il brand resterà senza società.")).toBeVisible();
  await page.getByRole("button", { name: "Salva collegamenti" }).click();
  await expect(page.getByText("Il brand ora non è collegato a nessuna società.")).toBeVisible();

  const { id } = await brandRow();
  const { data } = await admin()
    .from("audit_log")
    .select("action")
    .eq("table_name", "company_brands")
    .eq("record_id", id);
  expect(data?.map((row) => row.action).sort()).toEqual(["delete", "insert"]);
});

test("il brand disattivato sparisce dall'elenco e si riattiva", async ({ page }) => {
  await signIn(page, owner);
  await page.goto(brandUrl);
  await page.getByRole("button", { name: "Disattiva", exact: true }).click();
  await expect(status(page, "Brand disattivato.")).toBeVisible();

  await page.goto("/impostazioni/societa-e-brand");
  await expect(page.getByRole("link", { name: brandName })).toHaveCount(0);
  await page.getByRole("link", { name: /^Mostra i disattivati/ }).click();
  await page.getByRole("link", { name: brandName }).click();
  await page.getByRole("button", { name: "Riattiva", exact: true }).click();
  await expect(status(page, "Brand riattivato.")).toBeVisible();
});

test("due società non possono avere la stessa partita IVA", async ({ page }) => {
  const first = `${testPrefix} IVA uno ${run} Srl`;
  const second = `${testPrefix} IVA due ${run} Srl`;
  await admin().from("companies").insert({ legal_name: first, vat_number: "01234567897" });
  await admin().from("companies").insert({ legal_name: second });
  const { data } = await admin().from("companies").select("id").eq("legal_name", second).single();

  await signIn(page, owner);
  await page.goto(`/impostazioni/societa-e-brand/societa/${data!.id}`);
  // Il modulo deve essere pronto (JavaScript caricato) prima di scrivere.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Partita IVA").fill("01234567897");
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(alert(page, "Esiste già una società con questa partita IVA.")).toBeVisible();
});

test("il consulente non apre i brand né carica loghi", async ({ page }) => {
  await signIn(page, consultant);
  await page.goto(brandUrl);
  await expect(page).toHaveURL("/?accesso=negato");
  const { id } = await brandRow();
  const response = await page.request.post("/api/loghi", {
    headers: { origin: new URL(page.url()).origin },
    multipart: {
      target: "brand",
      id,
      file: { name: "logo.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(response.status()).toBe(403);
});
