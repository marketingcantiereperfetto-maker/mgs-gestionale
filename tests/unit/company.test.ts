import { describe, expect, it } from "vitest";
import {
  companyReadiness,
  countryName,
  parseBankAccount,
  parseCompany,
  type CompanyData,
} from "@/domain/company/company";

const complete: CompanyData = {
  legalName: "Società Inventata Srl",
  vatNumber: "01234567897",
  taxCode: "01234567897",
  email: "amministrazione@prova.test",
  addressStreet: "Via di Prova 1",
  addressPostalCode: "00100",
  addressCity: "Roma",
  addressProvince: "RM",
  addressCountry: "IT",
};

describe("società: per crearla basta la ragione sociale", () => {
  it("accetta la sola ragione sociale, il resto resta vuoto", () => {
    const parsed = parseCompany({ legalName: "  Società   Inventata Srl " });
    expect(parsed).toEqual({
      ok: true,
      value: {
        legalName: "Società Inventata Srl",
        vatNumber: null,
        taxCode: null,
        email: null,
        addressStreet: null,
        addressPostalCode: null,
        addressCity: null,
        addressProvince: null,
        addressCountry: null,
      },
    });
  });

  it("senza ragione sociale non si salva", () => {
    expect(parseCompany({ legalName: "   " })).toEqual({
      ok: false,
      errors: { legalName: "Inserisci la ragione sociale." },
    });
  });
});

describe("società: i campi facoltativi, se compilati, devono essere validi", () => {
  it("normalizza spazi e maiuscole", () => {
    const parsed = parseCompany({
      legalName: "X",
      vatNumber: " 012 345 678 97 ",
      taxCode: "rssmra85t10a562s",
      email: "Info@Prova.Test",
      addressCountry: "it",
    });
    expect(parsed.ok && parsed.value).toMatchObject({
      vatNumber: "01234567897",
      taxCode: "RSSMRA85T10A562S",
      email: "info@prova.test",
      addressCountry: "IT",
    });
  });

  it("segnala ogni campo non valido", () => {
    const parsed = parseCompany({
      legalName: "X",
      vatNumber: "01234567890",
      taxCode: "RSSMRA85T10A562T",
      email: "non-è-una-email",
      addressCountry: "QQ",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.errors).sort()).toEqual([
      "addressCountry",
      "email",
      "taxCode",
      "vatNumber",
    ]);
  });

  it("il paese non ha un valore predefinito", () => {
    const parsed = parseCompany({ legalName: "X" });
    expect(parsed.ok && parsed.value.addressCountry).toBeNull();
    expect(countryName("IT")).toBe("Italia");
    expect(countryName("ZZ")).toBeNull();
  });
});

describe("conto bancario", () => {
  it("serve un IBAN valido; la descrizione è facoltativa", () => {
    expect(parseBankAccount({ iban: "it60 x054 2811 1010 0000 0123 456" })).toEqual({
      ok: true,
      value: { label: null, iban: "IT60X0542811101000000123456" },
    });
    expect(parseBankAccount({ iban: "" })).toMatchObject({ ok: false });
    expect(parseBankAccount({ iban: "IT61X0542811101000000123456" })).toEqual({
      ok: false,
      errors: { iban: "IBAN non valido: controlla le cifre." },
    });
  });
});

describe("pronta per emettere preventivi", () => {
  it("con tutti i dati è pronta; senza conto segnala l'IBAN a parte", () => {
    expect(companyReadiness(complete, true)).toEqual({
      ready: true,
      missing: [],
      bankAccountMissing: false,
    });
    expect(companyReadiness(complete, false)).toEqual({
      ready: true,
      missing: [],
      bankAccountMissing: true,
    });
  });

  it("elenca cosa manca", () => {
    const onlyName = {
      ...complete,
      vatNumber: null,
      taxCode: null,
      email: null,
      addressCity: null,
    };
    expect(companyReadiness(onlyName, false)).toEqual({
      ready: false,
      missing: ["partita IVA", "codice fiscale", "sede legale completa", "email"],
      bankAccountMissing: true,
    });
  });
});

describe("nome del brand", () => {
  it("è obbligatorio e perde gli spazi in eccesso", async () => {
    const { parseBrandName, brandNameKey } = await import("@/domain/company/brand");
    expect(parseBrandName("  Brand   Inventato ")).toEqual({
      ok: true,
      value: { name: "Brand Inventato" },
    });
    expect(parseBrandName("   ")).toEqual({
      ok: false,
      errors: { name: "Inserisci il nome del brand." },
    });
    // Maiuscole e spazi non contano nel confronto, come nel database.
    expect(brandNameKey(" BRAND  inventato")).toBe(brandNameKey("brand inventato"));
  });
});
