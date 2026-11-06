import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { isLocalSupabase } from "@/lib/supabase/test-project";

// Prove sul Supabase locale (le avvia «npm run test:db»). Rifiutano qualsiasi altro indirizzo.
const env = readSupabaseEnv();
if (!env || !isLocalSupabase(env.url)) {
  throw new Error("Prove di integrazione solo sul Supabase locale: usa «npm run test:db».");
}

function anonymousClient() {
  return createClient<Database>(env!.url, env!.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("Supabase locale: accesso solo su invito", () => {
  it("una registrazione libera fallisce", async () => {
    // Prima l'impostazione pubblica: se le registrazioni fossero aperte, il test si ferma qui
    // senza creare utenti.
    const response = await fetch(`${env!.url}/auth/v1/settings`, {
      headers: { apikey: env!.publishableKey },
    });
    const settings = (await response.json()) as { disable_signup?: boolean };
    expect(settings.disable_signup).toBe(true);

    const { data, error } = await anonymousClient().auth.signUp({
      email: "registrazione-libera-prova@stampaidea.it",
      password: "Prova-Registrazione-2026!",
    });
    expect(data.user).toBeNull();
    expect(
      error?.code,
      "Se il codice è un limite di tentativi (rate limit), riprova tra qualche minuto",
    ).toBe("signup_disabled");
  });

  it("chi non ha fatto l'accesso non legge profili, società e registro", async () => {
    const supabase = anonymousClient();
    for (const table of ["profiles", "profile_companies", "companies", "audit_log"] as const) {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      expect(data ?? []).toEqual([]);
      expect(error?.code).toBe("42501");
    }
  });

  it("chi non ha fatto l'accesso non segna la password né interroga gli utenti", async () => {
    const supabase = anonymousClient();
    const marked = await supabase.rpc("mark_password_set");
    expect(marked.error?.code).toBe("42501");
    const checked = await supabase.rpc("user_has_password", {
      target_user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(checked.error?.code).toBe("42501");
  });
});
