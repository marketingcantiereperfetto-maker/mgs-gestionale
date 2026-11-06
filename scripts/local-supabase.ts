// Supabase locale in Docker per le prove (T0). Indirizzi e chiavi si leggono da
// «supabase status» del nostro progetto e non si stampano mai; prima di usarli si controlla,
// senza rete, che siano davvero locali (porte 58321 e 58322 di supabase/config.toml).
import { execFileSync } from "node:child_process";
import { isLocalDatabase, isLocalSupabase } from "../src/lib/supabase/test-project.ts";

export type LocalSupabase = {
  apiUrl: string;
  dbUrl: string;
  publishableKey: string;
  secretKey: string;
};

const notRunning =
  "il Supabase locale non è avviato. Avvialo con «npm run db:locale:avvia» (serve Docker aperto).";

export function readLocalSupabase(): LocalSupabase {
  let status: Record<string, string>;
  try {
    const output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    status = JSON.parse(output) as Record<string, string>;
  } catch {
    throw new Error(notRunning);
  }
  const local = {
    apiUrl: status.API_URL ?? "",
    dbUrl: status.DB_URL ?? "",
    publishableKey: status.PUBLISHABLE_KEY ?? "",
    secretKey: status.SECRET_KEY ?? "",
  };
  if (!local.publishableKey || !local.secretKey) throw new Error(notRunning);
  if (!isLocalSupabase(local.apiUrl) || !isLocalDatabase(local.dbUrl)) {
    throw new Error("Supabase non è quello locale di questo progetto: nessuna prova avviata.");
  }
  return local;
}

// Variabili per l'app e per le prove: sostituiscono quelle di .env.local (cloud).
export function localEnv(local: LocalSupabase): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
    SUPABASE_SECRET_KEY: local.secretKey,
  };
}

// Archivi vuoti e migrazioni applicate da zero, prima di ogni giro di prove.
export function resetLocalDatabase(): void {
  execFileSync("npx", ["supabase", "db", "reset", "--local"], { stdio: "inherit" });
}
