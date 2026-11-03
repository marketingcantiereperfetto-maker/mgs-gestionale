import { expect, test } from "@playwright/test";

test("senza accesso si arriva alla pagina «Accedi», in italiano", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/accedi$/);
  await expect(page).toHaveTitle("Accedi · Gestionale MGS Group");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("heading", { name: "Accedi" })).toBeVisible();
  await expect(page.getByText("L'accesso è solo su invito.")).toBeVisible();
  await expect(page.getByRole("link", { name: /registra/i })).toHaveCount(0);
});

test("la pagina per la password non si apre senza accesso", async ({ page }) => {
  await page.goto("/imposta-password");
  await expect(page).toHaveURL(/\/accedi$/);
});

test("aprire il link di invito non verifica nulla: serve il clic sul pulsante", async ({
  page,
}) => {
  const link = "/auth/conferma?token_hash=non-valido&type=invite&next=/imposta-password";
  await page.goto(link);

  // Nessun reindirizzamento all'apertura: il codice non è stato usato.
  await expect(page).toHaveURL(link);
  await expect(page.getByRole("heading", { name: "Attiva l'account" })).toBeVisible();

  await page.getByRole("button", { name: "Attiva l'account" }).click();
  await expect(page).toHaveURL(/\/accedi\?errore=link-non-valido$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Il link non è valido o è scaduto" }),
  ).toBeVisible();
});

test("un link di invito incompleto mostra subito un messaggio chiaro", async ({ page }) => {
  await page.goto("/auth/conferma?type=invite");
  await expect(page.getByRole("button", { name: "Attiva l'account" })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Il link non è valido" })).toBeVisible();
});
