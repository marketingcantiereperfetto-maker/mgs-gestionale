import { describe, expect, it } from "vitest";
import { customerSearchFilter } from "@/domain/customers/search";

describe("ricerca clienti", () => {
  it("cerca per nome, PEC, partita IVA e codice fiscale", () => {
    expect(customerSearchFilter("Rossi")).toBe(
      "name.ilike.*Rossi*,pec.ilike.*Rossi*,vat_number.ilike.*ROSSI*,tax_code.ilike.*ROSSI*",
    );
    expect(customerSearchFilter(" rssmra85 t10 ")).toBe(
      "name.ilike.*rssmra85 t10*,pec.ilike.*rssmra85 t10*,vat_number.ilike.*RSSMRA85T10*,tax_code.ilike.*RSSMRA85T10*",
    );
  });

  it("toglie i caratteri che cambierebbero il filtro", () => {
    const filter = customerSearchFilter("x),is_active.eq.false,(name.ilike.*");
    // Resta un solo testo da cercare: niente parentesi, nessuna virgola in più, quindi nessuna
    // condizione aggiunta.
    expect(filter).not.toMatch(/[()]/);
    expect(filter!.split(",")).toHaveLength(2);
    // Punti e chiocciola restano: si può cercare una PEC intera.
    expect(customerSearchFilter("fatture@pec.prova.test")).toBe(
      "name.ilike.*fatture@pec.prova.test*,pec.ilike.*fatture@pec.prova.test*",
    );
  });

  it("ignora ricerche vuote o di un solo carattere", () => {
    expect(customerSearchFilter("")).toBeNull();
    expect(customerSearchFilter(" a ")).toBeNull();
    expect(customerSearchFilter(undefined)).toBeNull();
  });
});
