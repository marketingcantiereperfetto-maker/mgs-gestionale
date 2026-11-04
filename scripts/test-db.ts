// Prove del database (pgTAP) solo sul progetto DI PROVA. Il controllo è fatto qui, senza rete:
// il riferimento del progetto in .env.local (e nell'indirizzo del database, se c'è) deve essere
// quello consentito. Con SUPABASE_DB_URL le prove si collegano direttamente al database e non
// dipendono dal servizio di gestione di Supabase; senza, usano il progetto collegato alla CLI.
// L'indirizzo del database contiene la password: non si stampa mai.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  isTestProject,
  projectRefFromDbUrl,
  testProjectRef,
} from "../src/lib/supabase/test-project.ts";

function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

if (!isTestProject(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  fail(
    `NEXT_PUBLIC_SUPABASE_URL non è il progetto di prova (${testProjectRef}). Nessuna prova avviata.`,
  );
}

const dbUrl = process.env.SUPABASE_DB_URL;
let args: string[];
if (dbUrl) {
  if (projectRefFromDbUrl(dbUrl) !== testProjectRef) {
    fail(
      `SUPABASE_DB_URL non è il database del progetto di prova (${testProjectRef}). Nessuna prova avviata.`,
    );
  }
  console.log("Prove sul database di prova, collegamento diretto (senza servizio di gestione).");
  args = ["supabase", "test", "db", "--db-url", dbUrl];
} else {
  let linked = "";
  try {
    linked = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  } catch {
    fail("nessun progetto collegato alla CLI e nessun SUPABASE_DB_URL in .env.local.");
  }
  if (linked !== testProjectRef) {
    fail(
      `il progetto collegato alla CLI non è quello di prova (${testProjectRef}). Nessuna prova avviata.`,
    );
  }
  console.log(
    "Prove sul progetto di prova collegato alla CLI. Senza SUPABASE_DB_URL dipendono dal servizio di gestione di Supabase.",
  );
  args = ["supabase", "test", "db", "--linked"];
}

const result = spawnSync("npx", args, { stdio: ["ignore", "inherit", "inherit"] });
process.exit(result.status ?? 1);
