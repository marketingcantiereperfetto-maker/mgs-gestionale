// Prove del database (pgTAP) solo sul progetto DI PROVA. Il controllo è fatto qui, senza rete:
// il riferimento del progetto in .env.local (e nell'indirizzo del database, se c'è) deve essere
// quello consentito. Con SUPABASE_DB_URL le prove si collegano direttamente al database e non
// dipendono dal servizio di gestione di Supabase; senza, usano il progetto collegato alla CLI.
// L'indirizzo del database contiene la password: non si stampa mai.
//
// Nessun giro passa in silenzio: il comando conta le prove dichiarate (plan(N) di ogni file) e
// fallisce se ne girano meno; ogni file ha un tempo massimo, e chi non risponde viene nominato.
// I casi anomali (prova lenta, senza risposta o mancante) si annotano in logs/prove-database.log.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import {
  checkRun,
  parseFileLine,
  parseSummary,
  plannedTests,
  type FileResult,
  type Summary,
} from "./test-db-report.ts";
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

// Tempi in secondi: un file di solito finisce in meno di 5 secondi, l'avvio (accesso
// temporaneo e collegamento) in meno di 15. PROVE_DB_TEMPO_MASSIMO cambia il tempo per file.
const fileTimeout = Number(process.env.PROVE_DB_TEMPO_MASSIMO ?? 60);
const startTimeout = 120;
const slowFile = 20;
const testsDir = "supabase/tests/database";
const logFile = "logs/prove-database.log";

const planned = plannedTests(
  readdirSync(testsDir)
    .filter((name) => name.endsWith(".test.sql"))
    .sort()
    .map((file) => ({ file, content: readFileSync(`${testsDir}/${file}`, "utf8") })),
);
if (!planned.ok) fail(planned.message);
const plans = planned.plans;
const expectedTests = plans.reduce((total, plan) => total + plan.planned, 0);

function note(event: string) {
  const line = `${new Date().toISOString()} ${event}`;
  try {
    mkdirSync("logs", { recursive: true });
    appendFileSync(logFile, `${line}\n`);
  } catch {
    console.error("Avviso: registro delle anomalie non scritto.");
  }
}

const seconds = (from: number) => Math.round((Date.now() - from) / 1000);
const results: FileResult[] = [];
let summary: Summary | null = null;
let phase: "avvio" | "prove" = "avvio";
let lastMark = Date.now();
let stalled: string | null = null;
// Righe stampate dalla CLI dopo l'ultimo file concluso: se il prossimo fallisce, si annotano
// (messaggi di psql e pg_prove sui dati inventati delle prove; l'indirizzo del database non
// compare mai nell'uscita della CLI).
let recent: string[] = [];

function remember(line: string) {
  recent.push(line);
  if (recent.length > 30) recent = recent.slice(-30);
}

// Gruppo di processi proprio, per poter fermare anche i processi figli della CLI.
const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"], detached: true });

function startTests() {
  if (phase === "avvio") {
    phase = "prove";
    lastMark = Date.now();
  }
}

createInterface({ input: child.stderr }).on("line", (line) => {
  console.error(line);
  remember(line);
  if (line.includes("Connecting to remote database")) startTests();
});

createInterface({ input: child.stdout }).on("line", (line) => {
  console.log(line);
  const fileResult = parseFileLine(line);
  if (fileResult) {
    startTests();
    const elapsed = seconds(lastMark);
    if (elapsed >= slowFile)
      note(`LENTA ${fileResult.file} ${elapsed}s esito=${fileResult.status}`);
    // Gli errori di psql arrivano prima della riga del file: si annotano con il suo nome.
    if (fileResult.status !== "ok") {
      note(
        `DETTAGLIO ${fileResult.file} dopo ${elapsed}s: ${recent.join(" ⏎ ") || "(nessuna riga)"}`,
      );
    }
    results.push(fileResult);
    lastMark = Date.now();
    recent = [];
    return;
  }
  remember(line);
  summary = parseSummary(line) ?? summary;
});

const watchdog = setInterval(() => {
  const limit = phase === "avvio" ? startTimeout : fileTimeout;
  const waited = seconds(lastMark);
  if (waited < limit || stalled) return;
  const next = plans.find((plan) => !results.some((result) => result.file === plan.file));
  stalled =
    phase === "avvio"
      ? `l'avvio (accesso temporaneo e collegamento al database) non ha risposto dopo ${waited} secondi.`
      : `la prova ${next?.file ?? "(sconosciuta)"} non ha risposto dopo ${waited} secondi.`;
  note(`SENZA RISPOSTA ${phase === "avvio" ? "avvio" : (next?.file ?? "?")} ${waited}s`);
  try {
    process.kill(-child.pid!, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  // Se la CLI non si chiude da sola, il resoconto arriva comunque entro 10 secondi.
  setTimeout(() => finish(null), 10_000).unref();
}, 1000);

let finished = false;

function finish(code: number | null) {
  if (finished) return;
  finished = true;
  clearInterval(watchdog);
  const problems = checkRun(plans, results, summary);
  if (stalled) problems.unshift(stalled);
  for (const result of results.filter((item) => item.status !== "ok")) {
    note(`ESITO ${result.file} «${result.status || "nessun esito"}»`);
  }
  if (problems.length > 0 && recent.length > 0) {
    note(`ULTIME RIGHE ${recent.join(" ⏎ ")}`);
  }
  if (problems.length === 0 && code !== 0)
    problems.push("la CLI di Supabase ha segnalato un errore.");
  if (problems.length > 0) {
    note(`FALLITO ${problems.join(" | ")}`);
    console.error("\nProve del database NON superate:");
    for (const problem of problems) console.error(`- ${problem}`);
    console.error(`Annotato in ${logFile}.`);
    process.exit(1);
  }
  console.log(
    `\nControllo: ${plans.length} file e ${expectedTests} prove eseguite, come previsto.`,
  );
  process.exit(0);
}

child.on("close", (code) => finish(code));
