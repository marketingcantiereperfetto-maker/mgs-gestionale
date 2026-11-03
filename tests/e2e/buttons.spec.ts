import { expect, test, type Locator } from "@playwright/test";

// Effetto «premuto» dei pulsanti, sul pulsante «Accedi» (pagina pubblica, nessun dato).

async function look(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, transform: style.transform };
  });
}

async function pressAndHold(button: Locator) {
  const box = await button.boundingBox();
  if (!box) throw new Error("Pulsante non visibile");
  await button.page().mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await button.page().mouse.down();
}

test("premuto con il mouse: più scuro e più piccolo; al rilascio torna normale", async ({
  page,
}) => {
  await page.goto("/accedi");
  const button = page.getByRole("button", { name: "Accedi" });
  const atRest = await look(button);

  await pressAndHold(button);
  // Stato finale dopo la transizione di 80 ms: blu più scuro (#005bbf) e scala al 97%.
  await expect
    .poll(() => look(button))
    .toEqual({ background: "rgb(0, 91, 191)", transform: "matrix(0.97, 0, 0, 0.97, 0, 0)" });
  expect(atRest).toEqual({ background: "rgb(0, 113, 227)", transform: "none" });

  await page.mouse.up();
  await expect.poll(() => look(button)).toEqual(atRest);
});

test("premuto da tastiera con Spazio tenuto giù", async ({ page }) => {
  await page.goto("/accedi");
  const button = page.getByRole("button", { name: "Accedi" });
  const atRest = await look(button);
  await button.focus();
  await page.keyboard.down(" ");
  await expect.poll(() => look(button)).not.toEqual(atRest);
  await page.keyboard.up(" ");
  await expect.poll(() => look(button)).toEqual(atRest);
});

test("con «riduci i movimenti» da premuto cambia solo il colore", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/accedi");
  const button = page.getByRole("button", { name: "Accedi" });
  const atRest = await look(button);

  await pressAndHold(button);
  await expect.poll(async () => (await look(button)).background).not.toBe(atRest.background);
  expect((await look(button)).transform).toBe("none");
  await page.mouse.up();
});

test("il bordo di selezione da tastiera è visibile", async ({ page }) => {
  await page.goto("/accedi");
  const button = page.getByRole("button", { name: "Accedi" });
  await page.getByLabel("Password").focus();
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  const outline = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline).toEqual({ style: "solid", width: "2px" });
});
