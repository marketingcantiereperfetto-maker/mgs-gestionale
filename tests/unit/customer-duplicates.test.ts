import { describe, expect, it } from "vitest";
import { decideDuplicates, type DuplicateCandidate } from "@/domain/customers/duplicates";

const other = (overrides: Partial<DuplicateCandidate>): DuplicateCandidate => ({
  name: "Cliente Inventato",
  city: "Comune di Prova",
  sameVatNumber: false,
  sameTaxCode: false,
  sameOfficeCode: false,
  ...overrides,
});

describe("doppioni di partita IVA o codice fiscale", () => {
  it("nessun altro cliente con gli stessi codici: si salva", () => {
    expect(decideDuplicates([], false)).toEqual({ kind: "ok" });
    expect(decideDuplicates([other({})], false)).toEqual({ kind: "ok" });
  });

  it("stessa partita IVA: serve la casella «È un cliente diverso»", () => {
    expect(decideDuplicates([other({ sameVatNumber: true })], false)).toEqual({
      kind: "confirm",
      message:
        "Esiste già un cliente con questa partita IVA: «Cliente Inventato» (Comune di Prova). Se è un cliente diverso, spunta «È un cliente diverso» e salva di nuovo.",
    });
    expect(decideDuplicates([other({ sameVatNumber: true })], true)).toEqual({ kind: "ok" });
  });

  it("stesso codice fiscale, senza comune", () => {
    const decision = decideDuplicates([other({ sameTaxCode: true, city: null })], false);
    expect(decision).toMatchObject({ kind: "confirm" });
    expect(decision.kind === "confirm" && decision.message).toContain(
      "con questo codice fiscale: «Cliente Inventato».",
    );
  });

  it("stessi codici e stesso codice ufficio PA: blocco, anche con la casella", () => {
    const decision = decideDuplicates([other({ sameTaxCode: true, sameOfficeCode: true })], true);
    expect(decision).toEqual({
      kind: "block",
      message:
        "Esiste già un cliente con questo codice fiscale e lo stesso codice ufficio: «Cliente Inventato» (Comune di Prova). Non si può salvare un doppione.",
    });
  });

  it("nei messaggi non compaiono mai codici", () => {
    const decision = decideDuplicates(
      [
        other({ sameVatNumber: true, sameTaxCode: true }),
        other({ name: "Altro", sameVatNumber: true }),
      ],
      false,
    );
    expect(decision.kind === "confirm" && decision.message).toBe(
      "Esiste già un cliente con questa partita IVA o questo codice fiscale: «Cliente Inventato» (Comune di Prova), «Altro» (Comune di Prova). Se è un cliente diverso, spunta «È un cliente diverso» e salva di nuovo.",
    );
  });
});
