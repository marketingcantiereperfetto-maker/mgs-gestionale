import { describe, expect, it } from "vitest";
import {
  customerCompleteness,
  effectiveRecipientCode,
  parseCustomer,
  type CustomerData,
  type CustomerInput,
} from "@/domain/customers/customer";

// Dati inventati: nessun cliente reale.
const address: CustomerInput = {
  addressStreet: "Via di Prova 1",
  addressPostalCode: "00100",
  addressCity: "Comune di Prova",
  addressProvince: "RM",
  addressCountry: "IT",
};

function parsed(input: CustomerInput): CustomerData {
  const result = parseCustomer({ name: "Cliente Inventato", ...input });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("cliente: per salvare basta il nome", () => {
  it("solo il nome, nessun valore predefinito (nemmeno il tipo)", () => {
    const value = parsed({});
    expect(value.subjectType).toBeNull();
    expect(value.vatRegime).toBeNull();
    expect(value.splitPayment).toBeNull();
    expect(value.addressCountry).toBeNull();
    expect(customerCompleteness(value)).toEqual({
      complete: false,
      missing: ["tipo di soggetto", "sede legale completa", "regime IVA"],
    });
  });

  it("senza nome non si salva", () => {
    expect(parseCustomer({ name: "  " })).toEqual({
      ok: false,
      errors: { name: "Inserisci il nome o la ragione sociale." },
    });
  });
});

describe("cliente: campi facoltativi validi se compilati", () => {
  it("normalizza e accetta valori corretti", () => {
    const value = parsed({
      vatNumber: " 012 345 678 97 ",
      taxCode: "rssmra85t10a562s",
      sdiCode: "abc1234",
      pec: "Fatture@PEC.Prova.test",
      paOfficeCode: "uf12ab",
      ...address,
      addressProvince: "rm",
    });
    expect(value).toMatchObject({
      vatNumber: "01234567897",
      taxCode: "RSSMRA85T10A562S",
      sdiCode: "ABC1234",
      pec: "fatture@pec.prova.test",
      paOfficeCode: "UF12AB",
      addressProvince: "RM",
    });
  });

  it("segnala ogni campo non valido", () => {
    const result = parseCustomer({
      name: "X",
      vatNumber: "01234567890",
      taxCode: "RSSMRA85T10A562T",
      sdiCode: "ABC12",
      pec: "non-una-pec",
      paOfficeCode: "UF12",
      addressCountry: "IT",
      addressPostalCode: "123",
      addressProvince: "Roma",
      intentDeclarationDate: "2026-02-30",
      subjectType: "altro",
      vatRegime: "speciale",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "addressPostalCode",
      "addressProvince",
      "intentDeclarationDate",
      "paOfficeCode",
      "pec",
      "sdiCode",
      "subjectType",
      "taxCode",
      "vatNumber",
      "vatRegime",
    ]);
  });

  it("CAP e provincia si controllano solo per l'Italia", () => {
    const value = parsed({
      addressCountry: "DE",
      addressPostalCode: "10115",
      addressProvince: "Berlin",
    });
    expect(value.addressProvince).toBe("BERLIN");
  });
});

describe("completa per fatturazione, per tipo di soggetto", () => {
  const base = { ...address, vatRegime: "ordinary" };

  it("azienda: partita IVA e codice destinatario o PEC", () => {
    expect(customerCompleteness(parsed({ subjectType: "company", ...base })).missing).toEqual([
      "partita IVA",
      "codice destinatario o PEC",
    ]);
    const withPec = parsed({
      subjectType: "company",
      ...base,
      vatNumber: "01234567897",
      pec: "fatture@pec.prova.test",
    });
    expect(customerCompleteness(withPec)).toEqual({ complete: true, missing: [] });
    expect(effectiveRecipientCode(withPec)).toBe("0000000");
  });

  it("professionista: partita IVA, codice fiscale e recapito", () => {
    expect(customerCompleteness(parsed({ subjectType: "professional", ...base })).missing).toEqual([
      "partita IVA",
      "codice fiscale",
      "codice destinatario o PEC",
    ]);
  });

  it("privato: codice fiscale; il codice destinatario è 0000000 da sé", () => {
    const value = parsed({ subjectType: "private", ...base });
    expect(customerCompleteness(value).missing).toEqual(["codice fiscale"]);
    const complete = parsed({ subjectType: "private", ...base, taxCode: "RSSMRA85T10A562S" });
    expect(customerCompleteness(complete).complete).toBe(true);
    expect(effectiveRecipientCode(complete)).toBe("0000000");
  });

  it("Pubblica Amministrazione: codice fiscale, ufficio e scelta sullo split payment", () => {
    expect(
      customerCompleteness(parsed({ subjectType: "public_administration", ...base })).missing,
    ).toEqual([
      "codice fiscale",
      "codice univoco ufficio",
      "nome dell'ufficio",
      "scelta sullo split payment",
    ]);
    const complete = parsed({
      subjectType: "public_administration",
      ...base,
      taxCode: "01234567897",
      paOfficeCode: "UF12AB",
      paOfficeName: "Ufficio inventato",
      splitPayment: "no",
    });
    expect(customerCompleteness(complete).complete).toBe(true);
    expect(effectiveRecipientCode(complete)).toBe("UF12AB");
  });

  it("estero: identificativo estero, nazione non italiana, provincia non richiesta", () => {
    const italian = parsed({ subjectType: "foreign", ...base });
    expect(customerCompleteness(italian).missing).toEqual([
      "identificativo fiscale estero",
      "nazione estera (non Italia)",
    ]);
    const complete = parsed({
      subjectType: "foreign",
      vatRegime: "reverse_charge",
      foreignTaxId: "DE123456789",
      addressStreet: "Musterstraße 1",
      addressPostalCode: "10115",
      addressCity: "Berlin",
      addressCountry: "DE",
    });
    expect(customerCompleteness(complete).complete).toBe(true);
    expect(effectiveRecipientCode(complete)).toBe("XXXXXXX");
  });

  it("regime IVA: natura per l'esenzione, numero e data per la dichiarazione d'intento", () => {
    const company = {
      subjectType: "company",
      ...address,
      vatNumber: "01234567897",
      sdiCode: "ABC1234",
    };
    expect(customerCompleteness(parsed({ ...company, vatRegime: "exempt" })).missing).toEqual([
      "natura dell'esenzione",
    ]);
    expect(
      customerCompleteness(parsed({ ...company, vatRegime: "intent_declaration" })).missing,
    ).toEqual(["numero della dichiarazione d'intento", "data della dichiarazione d'intento"]);
    expect(
      customerCompleteness(
        parsed({
          ...company,
          vatRegime: "intent_declaration",
          intentDeclarationNumber: "123/2026",
          intentDeclarationDate: "2026-01-15",
        }),
      ).complete,
    ).toBe(true);
  });
});
