import { describe, expect, it } from "vitest";
import { prepareCustomerSearch } from "@/domain/customers/search";

describe("ricerca clienti", () => {
  it("prepara il testo da cercare, ripulendo gli spazi", () => {
    expect(prepareCustomerSearch("  ufficio@rossi  ")).toEqual({
      kind: "search",
      term: "ufficio@rossi",
    });
    expect(prepareCustomerSearch("rssmra85   t10")).toEqual({
      kind: "search",
      term: "rssmra85 t10",
    });
  });

  it("senza testo mostra tutto l'elenco", () => {
    expect(prepareCustomerSearch("")).toEqual({ kind: "none" });
    expect(prepareCustomerSearch("   ")).toEqual({ kind: "none" });
    expect(prepareCustomerSearch(undefined)).toEqual({ kind: "none" });
  });

  it("testo da 3 a 100 caratteri", () => {
    expect(prepareCustomerSearch("ab")).toEqual({ kind: "short" });
    expect(prepareCustomerSearch("abc").kind).toBe("search");
    expect(prepareCustomerSearch("a".repeat(100)).kind).toBe("search");
    expect(prepareCustomerSearch("a".repeat(101))).toEqual({ kind: "long" });
  });
});
