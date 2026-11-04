import { describe, expect, it } from "vitest";
import { isTestProject } from "@/lib/supabase/test-project";

describe("i test con la chiave di amministrazione lavorano solo sul progetto di prova", () => {
  it("riconosce solo l'indirizzo del progetto di prova", () => {
    expect(isTestProject("https://rozukexrurbadsiznmby.supabase.co")).toBe(true);
    expect(isTestProject("https://altroprogetto.supabase.co")).toBe(false);
    expect(isTestProject("https://rozukexrurbadsiznmby.supabase.co.esempio.it")).toBe(false);
    expect(isTestProject("http://localhost:54321")).toBe(false);
    expect(isTestProject("")).toBe(false);
    expect(isTestProject(undefined)).toBe(false);
  });
});

describe("indirizzo diretto del database: riferimento del progetto senza rete", () => {
  it("riconosce il riferimento negli indirizzi diretti e del pooler", async () => {
    const { projectRefFromDbUrl } = await import("@/lib/supabase/test-project");
    expect(
      projectRefFromDbUrl(
        "postgresql://postgres:x@db.rozukexrurbadsiznmby.supabase.co:5432/postgres",
      ),
    ).toBe("rozukexrurbadsiznmby");
    expect(
      projectRefFromDbUrl(
        "postgresql://postgres.rozukexrurbadsiznmby:x@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
      ),
    ).toBe("rozukexrurbadsiznmby");
    expect(
      projectRefFromDbUrl("postgresql://postgres:x@db.altroprogetto.supabase.co:5432/postgres"),
    ).toBe("altroprogetto");
    expect(projectRefFromDbUrl("postgresql://postgres:x@localhost:54322/postgres")).toBeNull();
    expect(projectRefFromDbUrl("https://rozukexrurbadsiznmby.supabase.co")).toBeNull();
    expect(projectRefFromDbUrl(undefined)).toBeNull();
  });
});
