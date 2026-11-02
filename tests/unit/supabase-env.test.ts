import { afterEach, describe, expect, it, vi } from "vitest";
import { readSupabaseEnv, requireSupabaseEnv } from "@/lib/supabase/env";

describe("variabili di Supabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("restituisce indirizzo e chiave pubblica quando sono presenti", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://esempio.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_prova");
    expect(readSupabaseEnv()).toEqual({
      url: "https://esempio.supabase.co",
      publishableKey: "sb_publishable_prova",
    });
  });

  it("segnala in italiano le variabili mancanti", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(readSupabaseEnv()).toBeNull();
    expect(() => requireSupabaseEnv()).toThrow(/Mancano NEXT_PUBLIC_SUPABASE_URL/);
  });
});
