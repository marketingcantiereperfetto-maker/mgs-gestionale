import { describe, expect, it } from "vitest";
import { isValidPhone, parseAddress, parseContact } from "@/domain/customers/details";

describe("telefono del referente", () => {
  it.each([
    "+39 02 1234567",
    "+39 (02) 1234-5678",
    "02/1234567",
    "333.123.4567",
    "0039 333 1234567",
    "(06) 765 43 21",
    "123456",
  ])("accetta %s", (phone) => expect(isValidPhone(phone)).toBe(true));

  it.each(["12-345", "chiama 1234567", "333 1234567 int. 2", "++39 333 1234567", "1".repeat(21)])(
    "rifiuta %s",
    (phone) => expect(isValidPhone(phone)).toBe(false),
  );
});

describe("referente", () => {
  it("basta il nome; gli spazi si ripuliscono e l'email va in minuscolo", () => {
    expect(parseContact({ name: "  Anna   Prova ", email: " Anna@Prova.TEST " })).toEqual({
      ok: true,
      value: { name: "Anna Prova", role: null, email: "anna@prova.test", phone: null },
    });
  });

  it("nome obbligatorio, email e telefono controllati se compilati", () => {
    const parsed = parseContact({ name: " ", email: "anna-prova", phone: "12" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(["email", "name", "phone"]);
  });
});

describe("indirizzo di consegna", () => {
  const base = { street: "Via Prova 1", city: "Comune di Prova", country: "IT" };

  it("via, comune e paese obbligatori; la descrizione no", () => {
    const parsed = parseAddress({});
    expect(parsed.ok).toBe(false);
    if (!parsed.ok)
      expect(Object.keys(parsed.errors).sort()).toEqual(["city", "country", "street"]);
    expect(parseAddress(base)).toEqual({
      ok: true,
      value: { ...base, description: null, postalCode: null, province: null },
    });
  });

  it("in Italia CAP di 5 cifre e provincia di 2 lettere; all'estero liberi", () => {
    const italy = parseAddress({ ...base, postalCode: "123", province: "Roma" });
    expect(italy.ok).toBe(false);
    if (!italy.ok) expect(Object.keys(italy.errors).sort()).toEqual(["postalCode", "province"]);
    expect(parseAddress({ ...base, postalCode: "00100", province: "rm" }).ok).toBe(true);
    expect(
      parseAddress({ ...base, country: "fr", postalCode: "F-75001", province: "Île" }).ok,
    ).toBe(true);
  });

  it("paese sconosciuto rifiutato", () => {
    expect(parseAddress({ ...base, country: "ZZ" }).ok).toBe(false);
  });
});
