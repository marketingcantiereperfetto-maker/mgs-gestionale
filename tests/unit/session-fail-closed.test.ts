import { beforeEach, describe, expect, it, vi } from "vitest";

// Se la lettura di profilo e permessi fallisce, va oltre il tempo massimo o risponde con un
// errore, l'utente non ha nessun permesso: niente ripiego sul ruolo, e un messaggio chiaro.

type Outcome = "error" | "hang" | "throw" | "ok";
let outcome: Outcome = "ok";

const row = {
  role: "owner",
  full_name: "Titolare Prova",
  is_active: true,
  password_set_at: "2026-11-01T10:00:00Z",
  company_ids: [],
  permissions: ["costs.view", "users.manage"],
};

vi.mock("@/lib/supabase/env", () => ({
  readSupabaseEnv: () => ({ url: "x", publishableKey: "y" }),
}));
vi.mock("@/server/supabase", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "utente-prova", email: "t@prova.test" } } }),
    },
    rpc: () => {
      let signal: AbortSignal | undefined;
      const query = {
        abortSignal(value: AbortSignal) {
          signal = value;
          return query;
        },
        maybeSingle(): Promise<{ data: unknown; error: unknown }> {
          if (outcome === "error") {
            return Promise.resolve({
              data: null,
              error: { code: "08006", message: "connessione persa" },
            });
          }
          if (outcome === "throw") return Promise.reject(new Error("rete non raggiungibile"));
          if (outcome === "hang") {
            // Non risponde mai: solo il tempo massimo la interrompe.
            return new Promise((_, reject) =>
              signal?.addEventListener("abort", () => reject(signal?.reason)),
            );
          }
          return Promise.resolve({ data: row, error: null });
        },
      };
      return query;
    },
  }),
}));

const { getSession, getCurrentUser, sessionReadTimeoutMs } =
  await import("@/server/auth/current-user");
const { decidePageAccess } = await import("@/server/auth/page-access");
const { can } = await import("@/server/auth/permissions");

beforeEach(() => {
  outcome = "ok";
});

describe("lettura dei permessi fallita: nessun permesso", () => {
  it("con la lettura riuscita il titolare ha i suoi permessi", async () => {
    const session = await getSession();
    expect(session.status).toBe("active");
    expect(can(await getCurrentUser(), "users.manage")).toBe(true);
  });

  it("errore del database: nessun permesso, nemmeno per il titolare", async () => {
    outcome = "error";
    expect(await getSession()).toEqual({ status: "permissions-unavailable" });
    expect(await getCurrentUser()).toBeNull();
    expect(can(await getCurrentUser(), "users.manage")).toBe(false);
  });

  it("eccezione di rete: nessun permesso", async () => {
    outcome = "throw";
    expect(await getSession()).toEqual({ status: "permissions-unavailable" });
  });

  it(
    "nessuna risposta entro il tempo massimo: nessun permesso",
    async () => {
      outcome = "hang";
      const started = Date.now();
      expect(await getSession()).toEqual({ status: "permissions-unavailable" });
      expect(Date.now() - started).toBeGreaterThanOrEqual(sessionReadTimeoutMs - 100);
    },
    sessionReadTimeoutMs + 5000,
  );

  it("le pagine mostrano il messaggio, non la dashboard in silenzio", () => {
    expect(
      decidePageAccess({ status: "permissions-unavailable" }, "/clienti/da-completare"),
    ).toEqual({ kind: "redirect", to: "/verifica-permessi?da=%2Fclienti%2Fda-completare" });
  });
});
