import { expect, test } from "@playwright/test";

test("la pagina iniziale si apre in italiano", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Gestionale MGS Group");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("heading", { name: "Gestionale MGS Group" })).toBeVisible();
  await expect(page.getByTestId("database-status")).toContainText("Collegamento al database");
});
