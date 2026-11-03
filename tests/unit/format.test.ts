import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDecimal, formatEuro } from "@/lib/format";

// Intl usa spazi speciali tra cifra e simbolo: li rendiamo normali per leggere meglio i test.
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("euro", () => {
  it("virgola decimale, punto per le migliaia, simbolo dopo", () => {
    expect(plain(formatEuro("1234.5"))).toBe("1.234,50 €");
    expect(plain(formatEuro("1234567.89"))).toBe("1.234.567,89 €");
    expect(plain(formatEuro("0.1"))).toBe("0,10 €");
    expect(plain(formatEuro("-15"))).toBe("-15,00 €");
  });

  it("resta esatto anche oltre la precisione dei numeri in virgola mobile", () => {
    expect(plain(formatEuro("12345678901234567.89"))).toBe("12.345.678.901.234.567,89 €");
  });

  it("non arrotonda di nascosto e rifiuta i valori non decimali", () => {
    expect(() => formatEuro("10.005")).toThrow(/più di due decimali/);
    expect(() => formatEuro("10,5")).toThrow(/non valido/);
    expect(() => formatEuro("")).toThrow(/non valido/);
  });
});

describe("numeri e quantità", () => {
  it("mostra tutte le cifre ricevute con la virgola", () => {
    expect(formatDecimal("2.125")).toBe("2,125");
    expect(formatDecimal("1500")).toBe("1.500");
    expect(formatDecimal("0.0001")).toBe("0,0001");
  });
});

describe("date nel fuso di Roma", () => {
  it("giorno/mese/anno", () => {
    expect(formatDate("2026-11-03T10:00:00Z")).toBe("03/11/2026");
  });

  it("dopo le 23 UTC in Italia è già il giorno dopo", () => {
    expect(formatDate("2026-11-02T23:30:00Z")).toBe("03/11/2026");
    expect(plain(formatDateTime("2026-11-02T23:30:00Z"))).toBe("03/11/2026, 00:30");
  });

  it("segue l'ora legale", () => {
    expect(plain(formatDateTime("2026-07-01T10:00:00Z"))).toBe("01/07/2026, 12:00");
    expect(plain(formatDateTime("2026-12-01T10:00:00Z"))).toBe("01/12/2026, 11:00");
    // 29 marzo 2026: alle 02:00 le lancette passano alle 03:00.
    expect(plain(formatDateTime("2026-03-29T01:30:00Z"))).toBe("29/03/2026, 03:30");
  });

  it("rifiuta le date non valide", () => {
    expect(() => formatDate("non è una data")).toThrow(/Data non valida/);
  });
});
