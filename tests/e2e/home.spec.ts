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

test("un link di invito non valido rimanda all'accesso con un messaggio chiaro", async ({
  page,
}) => {
  await page.goto("/auth/conferma?token_hash=non-valido&type=invite");
  await expect(page).toHaveURL(/\/accedi\?errore=link-non-valido$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Il link non è valido o è scaduto" }),
  ).toBeVisible();
});
