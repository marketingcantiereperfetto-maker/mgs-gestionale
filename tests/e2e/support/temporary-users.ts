import { createClient } from "@supabase/supabase-js";
import type { BrowserContext, Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Database } from "../../../src/lib/supabase/database.types";
import { isLocalSupabase } from "../../../src/lib/supabase/test-project";
import type { UserRole } from "../../../src/server/auth/permissions";

// Utenti di prova sul Supabase LOCALE (T0), con password generate solo in memoria. Indirizzo e
// chiave segreta locali arrivano da «npm run test:e2e» e non si stampano mai.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const canUseTemporaryUsers = Boolean(url && secretKey);

export type TestUser = { id: string; email: string; role: UserRole };
export type TemporaryUser = TestUser & { password: string };

export function admin() {
  if (!isLocalSupabase(url)) {
    throw new Error(
      "Rifiutato: NEXT_PUBLIC_SUPABASE_URL non è il Supabase locale. " +
        "I test che scrivono e cancellano dati girano solo in locale (npm run test:e2e).",
    );
  }
  return createClient<Database>(url!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTemporaryUser(role: UserRole): Promise<TemporaryUser> {
  const email = `e2e-${role.replace("_", "-")}-${randomUUID().slice(0, 8)}@prova.test`;
  const password = randomBytes(24).toString("base64url");
  const supabase = admin();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Utente di prova non creato: ${error?.code ?? ""}`);

  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: data.user.id,
    role,
    full_name: `Prova ${role}`,
    password_set_at: new Date().toISOString(),
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(`Profilo di prova non creato: ${profileError.message}`);
  }
  return { id: data.user.id, email, password, role };
}

// Il profilo si cancella insieme all'utente (on delete cascade). Gli utenti condivisi dei ruoli
// restano fino al prossimo azzeramento del database.
export async function deleteTemporaryUser(user: TestUser): Promise<void> {
  if (isRoleUser(user)) return;
  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error && error.code !== "user_not_found")
    throw new Error(`Utente di prova ${user.id} non cancellato: ${error.code ?? ""}`);
}

export async function signIn(page: Page, user: TemporaryUser): Promise<void> {
  await page.goto("/accedi");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL((address) => address.pathname === "/");
}

// Se un test precedente si è interrotto prima della pulizia, cancella i suoi utenti di prova.
// Tocca solo gli indirizzi e2e-…@prova.test, che nessuna persona reale può avere, creati da
// più di un'ora: quelli recenti possono appartenere a prove in corso in parallelo.
export async function deleteLeftoverTemporaryUsers(): Promise<void> {
  const supabase = admin();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Elenco utenti non letto: ${error.code ?? ""}`);
  for (const user of data.users) {
    const isOld = Date.now() - new Date(user.created_at).getTime() > 60 * 60 * 1000;
    if (isOld && /^e2e-[a-z-]+-[0-9a-f]{8}@prova\.test$/.test(user.email ?? "")) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }
}

// Un solo accesso per ruolo a ogni giro: il progetto «accessi» (accessi.setup.ts) crea un utente
// per ruolo, fa l'accesso una volta e salva la sessione; le prove la riusano. Gli utenti
// dedicati (permessi cambiati, limite delle ricerche) fanno un accesso solo, riusato nel file.
export const roles: UserRole[] = [
  "owner",
  "sales_manager",
  "sales_consultant",
  "catalog_admin",
  "finance_admin",
];
const sessionsDir = "playwright/.auth";
const roleUsersFile = `${sessionsDir}/utenti.json`;

export function sessionFile(role: UserRole): string {
  return `${sessionsDir}/${role}.json`;
}

export function saveRoleUsers(users: TestUser[]): void {
  mkdirSync(sessionsDir, { recursive: true });
  writeFileSync(roleUsersFile, JSON.stringify(users));
}

let roleUsers: TestUser[] | null = null;
function readRoleUsers(): TestUser[] {
  roleUsers ??= JSON.parse(readFileSync(roleUsersFile, "utf8")) as TestUser[];
  return roleUsers;
}

export function roleUser(role: UserRole): TestUser {
  const user = readRoleUsers().find((item) => item.role === role);
  if (!user)
    throw new Error(`Utente condiviso del ruolo ${role} mancante: rilancia npm run test:e2e.`);
  return user;
}

function isRoleUser(user: TestUser): boolean {
  return readRoleUsers().some((item) => item.id === user.id);
}

type Cookies = Awaited<ReturnType<BrowserContext["cookies"]>>;
const dedicatedSessions = new Map<string, Cookies>();

// Apre la dashboard con la sessione dell'utente, senza un nuovo accesso.
export async function openSession(page: Page, user: TestUser): Promise<void> {
  let cookies = dedicatedSessions.get(user.id);
  if (isRoleUser(user)) {
    cookies = (JSON.parse(readFileSync(sessionFile(user.role), "utf8")) as { cookies: Cookies })
      .cookies;
  }
  if (!cookies) {
    if (!("password" in user)) throw new Error("Utente senza password né sessione salvata.");
    await signIn(page, user as TemporaryUser);
    dedicatedSessions.set(user.id, await page.context().cookies());
    return;
  }
  await page.context().addCookies(cookies);
  await page.goto("/");
}

// Chiave d'accesso della sessione già aperta (del ruolo o dell'utente dedicato), per le prove che chiamano direttamente
// Supabase: niente nuovo accesso. Il cookie di Supabase può essere diviso in più parti.
export function accessToken(user: TestUser): string {
  const cookies = isRoleUser(user)
    ? (JSON.parse(readFileSync(sessionFile(user.role), "utf8")) as { cookies: Cookies }).cookies
    : dedicatedSessions.get(user.id);
  if (!cookies) throw new Error("Nessuna sessione aperta per questo utente.");
  const parts = cookies
    .filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((cookie) => cookie.value)
    .join("");
  const raw = parts.startsWith("base64-")
    ? Buffer.from(parts.slice("base64-".length), "base64url").toString("utf8")
    : decodeURIComponent(parts);
  const token = (JSON.parse(raw) as { access_token?: string }).access_token;
  if (!token) throw new Error(`Sessione salvata del ruolo ${user.role} senza chiave d'accesso.`);
  return token;
}
