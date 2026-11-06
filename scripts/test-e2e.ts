// Prove nel browser (Playwright) solo sul Supabase LOCALE in Docker (T0), mai sul cloud.
// Prima il database si azzera (archivi vuoti, migrazioni da zero); poi le prove partono con
// indirizzo e chiavi locali al posto di quelli di .env.local. Nulla di segreto si stampa.
// Uso: npm run test:e2e [-- argomenti di Playwright, per esempio un file di prova]
import { spawnSync } from "node:child_process";
import { localEnv, readLocalSupabase, resetLocalDatabase } from "./local-supabase.ts";

try {
  const local = readLocalSupabase();
  console.log("Database locale: azzeramento e migrazioni da zero.");
  await resetLocalDatabase(local);
  const run = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ...localEnv(local) },
  });
  process.exit(run.status ?? 1);
} catch (error) {
  console.error(`Errore: ${error instanceof Error ? error.message : "prove non avviate."}`);
  process.exit(1);
}
