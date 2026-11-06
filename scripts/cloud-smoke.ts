// Prova di fumo MANUALE sul progetto cloud DI PROVA (T0, scelta B): controlla solo che le
// impostazioni siano uguali a quelle del Supabase locale. Non gira sulle richieste di modifica.
// Uso: npm run prova:cloud   (legge .env.local; nessun valore segreto si stampa)
// Controlla: iscrizioni libere chiuse, password di almeno 12 caratteri, limiti dei loghi.
// Le foto si aggiungeranno quando esisterà il loro archivio (oggi c'è solo quello dei loghi).
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { isTestProject, testProjectRef } from "../src/lib/supabase/test-project.ts";

// Stessi valori di supabase/config.toml e della migrazione dei loghi (crea_brand_e_loghi).
const minimumPasswordLength = 12;
const logos = {
  public: false,
  fileSizeLimit: 1_048_576,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!isTestProject(url) || !publishableKey || !secretKey) {
  console.error(
    `Errore: serve il progetto di prova (${testProjectRef}) in .env.local. Nessun controllo avviato.`,
  );
  process.exit(1);
}

const problems: string[] = [];
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "NO  "} ${label}`);
  if (!ok) problems.push(label);
};
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(url!, publishableKey, options);
const admin = createClient(url!, secretKey, options);

// 1. Iscrizioni libere chiuse: prima l'impostazione pubblica, poi un tentativo che deve fallire.
const settings = (await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: publishableKey },
}).then((answer) => answer.json())) as { disable_signup?: boolean };
check(settings.disable_signup === true, "iscrizioni libere chiuse (impostazione)");
if (settings.disable_signup === true) {
  const signUp = await anonymous.auth.signUp({
    email: `fumo-iscrizione-${randomUUID().slice(0, 8)}@prova.test`,
    password: "Prova-Iscrizione-2026!",
  });
  check(signUp.error?.code === "signup_disabled", "iscrizione libera rifiutata");
}

// 2. Password: una di 11 caratteri è rifiutata. Se per errore passasse, l'utente si cancella subito.
const short = "x".repeat(minimumPasswordLength - 1);
const created = await admin.auth.admin.createUser({
  email: `fumo-password-${randomUUID().slice(0, 8)}@prova.test`,
  password: short,
  email_confirm: true,
});
if (created.data.user) await admin.auth.admin.deleteUser(created.data.user.id);
check(
  created.error?.code === "weak_password",
  `password di ${minimumPasswordLength - 1} caratteri rifiutata (minimo ${minimumPasswordLength})`,
);

// 3. Archivio dei loghi: privato, 1 MB al massimo, solo PNG, JPEG e WebP.
const bucket = await admin.storage.getBucket("logos");
check(!bucket.error && bucket.data.public === logos.public, "archivio dei loghi privato");
check(bucket.data?.file_size_limit === logos.fileSizeLimit, "loghi al massimo di 1 MB");
check(
  JSON.stringify([...(bucket.data?.allowed_mime_types ?? [])].sort()) ===
    JSON.stringify(logos.mimeTypes),
  "loghi solo PNG, JPEG e WebP",
);

if (problems.length > 0) {
  console.error(`\nImpostazioni del cloud DIVERSE da quelle locali: ${problems.join("; ")}.`);
  process.exit(1);
}
console.log("\nCloud di prova allineato al Supabase locale.");
