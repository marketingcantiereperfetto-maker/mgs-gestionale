import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "../../../src/lib/supabase/database.types";
import { isTestProject, testProjectRef } from "../../../src/lib/supabase/test-project";
import type { UserRole } from "../../../src/server/auth/permissions";

// Utenti di prova temporanei: creati per il test, con password generate solo in memoria,
// e cancellati alla fine. Servono la chiave segreta e l'indirizzo del database di prova
// (da .env.local, mai stampati); senza, i test che li usano vengono saltati.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const canUseTemporaryUsers = Boolean(url && secretKey);

export type TemporaryUser = { id: string; email: string; password: string; role: UserRole };

export function admin() {
  if (!isTestProject(url)) {
    throw new Error(
      `Rifiutato: NEXT_PUBLIC_SUPABASE_URL non è il progetto di prova (${testProjectRef}). ` +
        "I test che cancellano dati non partono su altri progetti.",
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

// Il profilo si cancella insieme all'utente (on delete cascade).
export async function deleteTemporaryUser(user: TemporaryUser): Promise<void> {
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
