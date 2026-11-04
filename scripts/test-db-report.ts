// Controlli sul resoconto delle prove del database (pgTAP): nessun giro deve passare in silenzio
// se qualche prova non è stata eseguita. Funzioni pure, provate in tests/unit.

export type PlannedFile = { file: string; planned: number };
export type FileResult = { file: string; status: string };
export type Summary = { files: number; tests: number };

// Numero di prove dichiarato da ogni file con `select plan(N);`.
export function plannedTests(
  files: { file: string; content: string }[],
): { ok: true; plans: PlannedFile[] } | { ok: false; message: string } {
  const plans: PlannedFile[] = [];
  for (const { file, content } of files) {
    const match = /select\s+plan\(\s*(\d+)\s*\)/i.exec(content);
    if (!match) return { ok: false, message: `il file ${file} non dichiara plan(N).` };
    plans.push({ file, planned: Number(match[1]) });
  }
  return { ok: true, plans };
}

// Riga di pg_prove alla fine di un file: «…/nome.test.sql ....... ok».
export function parseFileLine(line: string): FileResult | null {
  const match = /([^/\s]+\.test\.sql)\s\.+\s?(.*)$/.exec(line.trim());
  return match ? { file: match[1]!, status: match[2]!.trim() } : null;
}

// Riga finale: «Files=11, Tests=169, …».
export function parseSummary(line: string): Summary | null {
  const match = /Files=(\d+), Tests=(\d+)/.exec(line);
  return match ? { files: Number(match[1]), tests: Number(match[2]) } : null;
}

// Problemi del giro, in italiano; vuoto se tutto torna.
export function checkRun(
  plans: PlannedFile[],
  results: FileResult[],
  summary: Summary | null,
): string[] {
  const problems: string[] = [];
  const expectedTests = plans.reduce((total, plan) => total + plan.planned, 0);
  const missing = plans.filter((plan) => !results.some((result) => result.file === plan.file));
  if (missing.length > 0) {
    problems.push(`prove non eseguite: ${missing.map((plan) => plan.file).join(", ")}.`);
  }
  for (const result of results) {
    if (result.status !== "ok") {
      problems.push(
        `la prova ${result.file} non è andata a buon fine (${result.status || "nessun esito"}).`,
      );
    }
  }
  if (!summary) {
    problems.push("manca il riepilogo finale: il giro si è interrotto.");
  } else {
    if (summary.files < plans.length) {
      problems.push(`eseguiti ${summary.files} file su ${plans.length}.`);
    }
    if (summary.tests < expectedTests) {
      problems.push(`eseguite ${summary.tests} prove su ${expectedTests} attese.`);
    }
  }
  return problems;
}
