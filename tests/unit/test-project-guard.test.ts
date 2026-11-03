import { describe, expect, it } from "vitest";
import { isTestProject } from "../e2e/support/temporary-users";

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
