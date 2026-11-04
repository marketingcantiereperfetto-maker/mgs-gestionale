import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { customerCompleteness } from "../../src/domain/customers/customer";
import { incompleteScanLimit } from "../../src/domain/customers/incomplete";
import { toCustomer } from "../../src/server/customers/row";
import { deleteTestCustomers, runPrefix } from "./support/test-data";
import {
  admin,
  canUseTemporaryUsers,
  createTemporaryUser,
  deleteTemporaryUser,
  signIn,
  type TemporaryUser,
} from "./support/temporary-users";

// Riquadro «Clienti da completare» e pagina relativa, con dati inventati cancellati alla fine.
// Gira da solo, dopo il percorso guidato (progetto «riquadro-clienti»): il numero atteso si
// ricalcola dal database con la stessa regola, perché nel database di prova possono esserci
// anche clienti veri (il «CLIENTE PROVA» del titolare, che non si tocca).
test.skip(!canUseTemporaryUsers, "servono le variabili del database di prova in .env.local");
test.describe.configure({ mode: "serial" });

const mine = runPrefix(randomUUID().slice(0, 8));
const users: Partial<
  Record<"owner" | "consultant" | "manager" | "finance" | "catalog", TemporaryUser>
> = {};
const secretTaxCode = "RSSMRA85T10A562S";

test.beforeAll(async () => {
  test.setTimeout(120_000);
  users.owner = await createTemporaryUser("owner");
  users.consultant = await createTemporaryUser("sales_consultant");
  users.manager = await createTemporaryUser("sales_manager");
  users.finance = await createTemporaryUser("finance_admin");
  users.catalog = await createTemporaryUser("catalog_admin");
  // Sette incompleti (con un codice fiscale, che non deve mai comparire), uno completo e uno
  // incompleto ma disattivato.
  const rows = [
    ...Array.from({ length: 7 }, (_, index) => ({
      name: `${mine} Da completare ${index + 1}`,
      tax_code: secretTaxCode,
      pec: "segreta@pec.prova.test",
      is_active: true,
    })),
    {
      name: `${mine} Completo`,
      subject_type: "private" as const,
      tax_code: secretTaxCode,
      address_street: "Via Prova 1",
      address_postal_code: "00100",
      address_city: "Comune di Prova",
      address_province: "RM",
      address_country: "IT",
      vat_regime: "ordinary" as const,
      is_active: true,
    },
    { name: `${mine} Disattivato`, is_active: false },
  ];
  // Inserendo più righe insieme, i campi non indicati arrivano vuoti: «attivo» va scritto su tutte.
  const { error } = await admin().from("customers").insert(rows);
  if (error) throw new Error(`Clienti di prova non creati: ${error.message}`);
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  for (const user of Object.values(users)) if (user) await deleteTemporaryUser(user);
  await deleteTestCustomers({ prefix: mine });
});

// Quello che il riquadro deve mostrare, calcolato dal database con la stessa regola.
async function expected() {
  const { data, error } = await admin()
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("name")
    .order("id")
    .limit(incompleteScanLimit + 1);
  if (error) throw new Error(error.message);
  const incomplete = data
    .slice(0, incompleteScanLimit)
    .map(toCustomer)
    .filter((customer) => !customerCompleteness(customer).complete);
  return { total: incomplete.length, names: incomplete.slice(0, 5).map((row) => row.name) };
}

async function dashboard(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

const card = (page: Page) => page.getByTestId("incomplete-customers");

test("titolare: conteggio, primi 5 nomi con il collegamento e «e altri N», nessun dato personale", async ({
  page,
}) => {
  const { total, names } = await expected();
  expect(total).toBeGreaterThanOrEqual(7);

  await signIn(page, users.owner!);
  await dashboard(page);
  await expect(page.getByRole("heading", { name: "Clienti da completare" })).toBeVisible();
  await expect(page.getByTestId("incomplete-headline")).toHaveText(
    `${total} clienti attivi da completare per la fatturazione.`,
  );
  const links = card(page).getByTestId("incomplete-names").getByRole("link");
  await expect(links).toHaveText(names);
  await expect(page.getByTestId("incomplete-others")).toHaveText(`e altri ${total - 5}`);
  const text = await card(page).innerText();
  expect(text).not.toMatch(/RSSMRA|segreta|pec\.prova|Via Prova/);
  expect(text).not.toContain(`${mine} Completo`);
  expect(text).not.toContain(`${mine} Disattivato`);

  // Ogni nome porta alla sua scheda.
  await links.first().click();
  await page.waitForURL(/\/clienti\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: names[0]! })).toBeVisible();
});

test("anche responsabile, consulente e amministrazione economica vedono il riquadro", async ({
  page,
}) => {
  const { total } = await expected();
  for (const user of [users.manager!, users.consultant!, users.finance!]) {
    await page.context().clearCookies();
    await signIn(page, user);
    await dashboard(page);
    await expect(page.getByTestId("incomplete-headline"), user.role).toHaveText(
      `${total} clienti attivi da completare per la fatturazione.`,
    );
    // Il percorso guidato resta del titolare.
    await expect(page.getByTestId("setup-message")).toHaveText(
      "La configurazione iniziale la cura il titolare.",
    );
  }
});

test("l'amministrazione cataloghi non vede il riquadro né la pagina", async ({ page }) => {
  await signIn(page, users.catalog!);
  await dashboard(page);
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Clienti da completare" })).toHaveCount(0);
  await page.goto("/clienti/da-completare");
  await expect(page).toHaveURL("/?accesso=negato");
});

test("pagina «Clienti da completare»: solo attivi incompleti, dal menu", async ({ page }) => {
  await signIn(page, users.consultant!);
  await dashboard(page);
  const menu = page.getByRole("navigation", { name: "Menu principale" });
  await menu.getByRole("button", { name: "Clienti", exact: true }).click();
  await menu.getByRole("link", { name: "Clienti da completare" }).click();
  await page.waitForURL("/clienti/da-completare");
  await page.waitForLoadState("networkidle");
  for (let index = 1; index <= 7; index++) {
    await expect(page.getByRole("link", { name: `${mine} Da completare ${index}` })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: `${mine} Completo` })).toHaveCount(0);
  await expect(page.getByRole("link", { name: `${mine} Disattivato` })).toHaveCount(0);
  expect(await page.getByTestId("customers-table").innerText()).not.toMatch(/RSSMRA|segreta/);
});

test("disattivato un cliente da completare, il riquadro si aggiorna", async ({ page }) => {
  const before = await expected();
  const { error } = await admin()
    .from("customers")
    .update({ is_active: false })
    .eq("name", `${mine} Da completare 1`);
  expect(error).toBeNull();
  await signIn(page, users.owner!);
  await dashboard(page);
  await expect(page.getByTestId("incomplete-headline")).toHaveText(
    `${before.total - 1} clienti attivi da completare per la fatturazione.`,
  );
  await expect(
    card(page).getByRole("link", { name: `${mine} Da completare 1`, exact: true }),
  ).toHaveCount(0);
});
