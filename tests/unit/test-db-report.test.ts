import { describe, expect, it } from "vitest";
import {
  checkRun,
  parseFileLine,
  parseSummary,
  plannedTests,
} from "../../scripts/test-db-report.ts";

const plans = [
  { file: "a.test.sql", planned: 3 },
  { file: "b.test.sql", planned: 2 },
];

describe("resoconto delle prove del database", () => {
  it("legge plan(N) da ogni file; senza plan è un errore", () => {
    expect(
      plannedTests([
        { file: "a.test.sql", content: "begin;\nselect plan(3);\n" },
        { file: "b.test.sql", content: "SELECT PLAN( 2 );" },
      ]),
    ).toEqual({ ok: true, plans });
    expect(plannedTests([{ file: "c.test.sql", content: "select 1;" }])).toEqual({
      ok: false,
      message: "il file c.test.sql non dichiara plan(N).",
    });
  });

  it("riconosce le righe dei file e il riepilogo", () => {
    expect(parseFileLine("/x/supabase/tests/database/a.test.sql ........ ok")).toEqual({
      file: "a.test.sql",
      status: "ok",
    });
    expect(parseFileLine("/x/b.test.sql .. Failed 1/2 subtests")).toEqual({
      file: "b.test.sql",
      status: "Failed 1/2 subtests",
    });
    expect(parseFileLine("All tests successful.")).toBeNull();
    expect(parseSummary("Files=11, Tests=169, 33 wallclock secs")).toEqual({
      files: 11,
      tests: 169,
    });
  });

  it("tutto eseguito: nessun problema", () => {
    const results = plans.map((plan) => ({ file: plan.file, status: "ok" }));
    expect(checkRun(plans, results, { files: 2, tests: 5 })).toEqual([]);
  });

  it("meno prove del previsto: il giro non passa, anche se pg_prove dice PASS", () => {
    const results = [{ file: "a.test.sql", status: "ok" }];
    expect(checkRun(plans, results, { files: 1, tests: 3 })).toEqual([
      "prove non eseguite: b.test.sql.",
      "eseguiti 1 file su 2.",
      "eseguite 3 prove su 5 attese.",
    ]);
  });

  it("file senza esito e giro interrotto", () => {
    const results = [
      { file: "a.test.sql", status: "ok" },
      { file: "b.test.sql", status: "" },
    ];
    expect(checkRun(plans, results, null)).toEqual([
      "la prova b.test.sql non è andata a buon fine (nessun esito).",
      "manca il riepilogo finale: il giro si è interrotto.",
    ]);
  });
});
