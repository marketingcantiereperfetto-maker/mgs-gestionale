import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { admin, canUseTemporaryUsers, deleteTemporaryUser } from "./support/temporary-users";

// Invito, scelta della password e primo accesso, solo sul Supabase locale: il nostro invito non
// usa l'email (come «npm run utenti:crea-titolare»: si crea il link e la pagina verifica il
// codice dopo il clic). Utente con email e nome unici per questa esecuzione.
test.skip(!canUseTemporaryUsers, "servono le variabili del Supabase locale (npm run test:e2e)");
test.describe.configure({ mode: "serial" });

const code = randomUUID().slice(0, 8);
const email = `e2e-invito-${code}@prova.test`;
const fullName = `Invitata ${code}`;
const password = randomBytes(18).toString("base64url");
let userId = "";
let inviteLink = "";

test.beforeAll(async () => {
  const supabase = admin();
  const { data, error } = await supabase.auth.admin.generateLink({ type: "invite", email });
  if (error || !data.user) throw new Error(`Invito di prova non creato: ${error?.code ?? ""}`);
  userId = data.user.id;
  const profile = await supabase
    .from("profiles")
    .insert({ user_id: userId, role: "sales_consultant", full_name: fullName });
  if (profile.error) throw new Error(`Profilo di prova non creato: ${profile.error.message}`);
  const link = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "invite",
    next: "/imposta-password",
  });
  inviteLink = `/auth/conferma?${link.toString()}`;
});

test.afterAll(async () => {
  if (userId) await deleteTemporaryUser({ id: userId, email, role: "sales_consultant" });
});

test("password sotto i 12 caratteri rifiutata anche da Supabase", async () => {
  const { data, error } = await admin().auth.admin.createUser({
    email: `e2e-corta-${code}@prova.test`,
    password: "Corta-11car",
    email_confirm: true,
  });
  if (data.user) await admin().auth.admin.deleteUser(data.user.id);
  expect(error?.code).toBe("weak_password");
});

test("invito: si attiva con il clic, si sceglie la password, si entra", async ({ page }) => {
  await page.goto(inviteLink);
  await page.getByRole("button", { name: "Attiva l'account" }).click();
  await page.waitForURL("/imposta-password");

  // Prima della password si vede solo la pagina per sceglierla.
  await page.goto("/clienti");
  await expect(page).toHaveURL("/imposta-password");

  await page.getByLabel("Nuova password").fill(password);
  await page.getByLabel("Ripeti la password").fill(password);
  await page.getByRole("button", { name: "Salva la password" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("button", { name: `Menu utente: ${fullName}` })).toBeVisible();

  const { data } = await admin()
    .from("profiles")
    .select("password_set_at")
    .eq("user_id", userId)
    .single();
  expect(data?.password_set_at).not.toBeNull();
});

test("il link d'invito vale una volta sola", async ({ page }) => {
  await page.goto(inviteLink);
  await page.getByRole("button", { name: "Attiva l'account" }).click();
  await expect(page).toHaveURL("/accedi?errore=link-non-valido");
});

test("primo accesso con la password scelta", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("button", { name: `Menu utente: ${fullName}` })).toBeVisible();
});
