import { describe, expect, it } from "vitest";
import {
  formatIban,
  isValidIban,
  isValidTaxCode,
  isValidVatNumber,
  normalizeCode,
} from "@/domain/company/identifiers";

// Valori di esempio inventati o pubblici (esempi standard), mai dati aziendali reali.
describe("partita IVA", () => {
  it("11 cifre con cifra di controllo corretta", () => {
    expect(isValidVatNumber("01234567897")).toBe(true);
  });

  it("rifiuta cifra di controllo sbagliata, lunghezza o caratteri errati", () => {
    expect(isValidVatNumber("01234567890")).toBe(false);
    expect(isValidVatNumber("0123456789")).toBe(false);
    expect(isValidVatNumber("012345678970")).toBe(false);
    expect(isValidVatNumber("0123456789A")).toBe(false);
  });
});

describe("codice fiscale", () => {
  it("16 caratteri di una persona con carattere di controllo corretto", () => {
    expect(isValidTaxCode("RSSMRA85T10A562S")).toBe(true);
  });

  it("accetta l'omocodia (cifre sostituite da lettere)", () => {
    expect(isValidTaxCode("RSSMRA85T10A56NH")).toBe(true);
  });

  it("11 cifre di una società, con lo stesso controllo della partita IVA", () => {
    expect(isValidTaxCode("01234567897")).toBe(true);
    expect(isValidTaxCode("01234567890")).toBe(false);
  });

  it("rifiuta carattere di controllo sbagliato e formati errati", () => {
    expect(isValidTaxCode("RSSMRA85T10A562T")).toBe(false);
    expect(isValidTaxCode("RSSMRA85Z10A562S")).toBe(false);
    expect(isValidTaxCode("RSSMRA85T10A562")).toBe(false);
    expect(isValidTaxCode("1234567890123456")).toBe(false);
  });
});

describe("IBAN", () => {
  it("accetta IBAN di paesi diversi con cifre di controllo corrette", () => {
    expect(isValidIban("IT60X0542811101000000123456")).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
    expect(isValidIban("GB82WEST12345698765432")).toBe(true);
  });

  it("rifiuta cifre di controllo sbagliate e formati errati", () => {
    expect(isValidIban("IT61X0542811101000000123456")).toBe(false);
    expect(isValidIban("IT60X054281110100000012345")).toBe(false);
    expect(isValidIban("IT60X05428111010000001234-6")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });

  it("si scrive con spazi e minuscole, si salva compatto e si mostra a gruppi", () => {
    const iban = normalizeCode(" it60 x054 2811 1010 0000 0123 456 ");
    expect(iban).toBe("IT60X0542811101000000123456");
    expect(isValidIban(iban)).toBe(true);
    expect(formatIban(iban)).toBe("IT60 X054 2811 1010 0000 0123 456");
  });
});
