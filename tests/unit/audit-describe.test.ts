import { describe, expect, it } from "vitest";
import { describeEntry, maskIban, type AuditEntry, type AuditNames } from "@/domain/audit/describe";

const owner = "00000000-0000-4000-8000-000000000001";
const consultant = "00000000-0000-4000-8000-000000000002";
const company = "00000000-0000-4000-8000-0000000000c1";
const brand = "00000000-0000-4000-8000-0000000000b1";

const names: AuditNames = {
  people: new Map([
    [owner, "Mario Rossi"],
    [consultant, "consulente@prova.test"],
  ]),
  companies: new Map([[company, "Società Inventata Srl"]]),
  brands: new Map([[brand, "Brand Inventato"]]),
};

function entry(overrides: Partial<AuditEntry>): AuditEntry {
  return {
    id: 1,
    occurredAt: "2026-11-03T10:00:00Z",
    actorId: owner,
    table: "companies",
    recordId: company,
    action: "insert",
    oldData: null,
    newData: null,
    ...overrides,
  };
}

const companyRow = { id: company, legal_name: "Società Inventata Srl", is_active: true };

describe("registro in italiano semplice", () => {
  it("creazione, disattivazione e riattivazione di una società", () => {
    expect(describeEntry(entry({ newData: companyRow }), names)).toEqual({
      actor: "Mario Rossi",
      sentence: "ha creato la società «Società Inventata Srl»",
      changes: [],
    });
    const off = entry({
      action: "update",
      oldData: companyRow,
      newData: { ...companyRow, is_active: false, updated_at: "x" },
    });
    expect(describeEntry(off, names).sentence).toBe(
      "ha disattivato la società «Società Inventata Srl»",
    );
    expect(describeEntry(off, names).changes).toEqual([]);
  });

  it("delle modifiche mostra solo i campi cambiati, con nomi in italiano", () => {
    const line = describeEntry(
      entry({
        action: "update",
        oldData: { ...companyRow, vat_number: null, address_country: null, updated_at: "a" },
        newData: {
          ...companyRow,
          vat_number: "01234567897",
          address_country: "IT",
          updated_at: "b",
        },
      }),
      names,
    );
    expect(line.sentence).toBe("ha modificato la società «Società Inventata Srl»");
    expect(line.changes).toEqual([
      { label: "Partita IVA", before: "(vuoto)", after: "01234567897" },
      { label: "Paese", before: "(vuoto)", after: "IT (Italia)" },
    ]);
  });

  it("mai campi tecnici, percorsi dei file o indirizzi firmati", () => {
    const line = describeEntry(
      entry({
        table: "brands",
        recordId: brand,
        action: "update",
        oldData: {
          id: brand,
          name: "Brand Inventato",
          logo_path: null,
          name_key: "brand inventato",
        },
        newData: {
          id: brand,
          name: "Brand Inventato",
          logo_path: `brands/${brand}/00000000-0000-4000-8000-0000000000aa.png`,
          creation_key: "00000000-0000-4000-8000-0000000000ff",
          name_key: "brand inventato",
        },
      }),
      names,
    );
    expect(line.sentence).toBe("ha caricato il logo del brand «Brand Inventato»");
    expect(line.changes).toEqual([]);
    expect(JSON.stringify(line)).not.toMatch(/brands\/|\.png|token|0000-4000/);
  });

  it("l'IBAN compare mascherato", () => {
    expect(maskIban("IT60X0542811101000000123456")).toBe("IT60 … 3456");
    const line = describeEntry(
      entry({
        table: "company_bank_accounts",
        newData: { company_id: company, iban: "IT60X0542811101000000123456", is_default: true },
      }),
      names,
    );
    expect(line.sentence).toBe(
      "ha aggiunto il conto IT60 … 3456 della società «Società Inventata Srl»",
    );
    expect(JSON.stringify(line)).not.toContain("0542811101");
  });

  it("collegamenti, profilo, password e procedure senza autore", () => {
    const link = { company_id: company, brand_id: brand };
    expect(describeEntry(entry({ table: "company_brands", newData: link }), names).sentence).toBe(
      "ha collegato il brand «Brand Inventato» alla società «Società Inventata Srl»",
    );
    expect(
      describeEntry(entry({ table: "company_brands", action: "delete", oldData: link }), names)
        .sentence,
    ).toBe("ha tolto il brand «Brand Inventato» dalla società «Società Inventata Srl»");

    const ownName = describeEntry(
      entry({
        table: "profiles",
        actorId: consultant,
        action: "update",
        oldData: { user_id: consultant, full_name: null, role: "sales_consultant" },
        newData: { user_id: consultant, full_name: "Anna Bianchi", role: "sales_consultant" },
      }),
      names,
    );
    expect(ownName).toEqual({
      actor: "consulente@prova.test",
      sentence: "ha cambiato il nome del proprio profilo",
      changes: [{ label: "Nome", before: "(vuoto)", after: "Anna Bianchi" }],
    });

    const password = describeEntry(
      entry({
        table: "profiles",
        actorId: consultant,
        action: "update",
        oldData: { user_id: consultant, password_set_at: null },
        newData: { user_id: consultant, password_set_at: "2026-11-03T10:00:00Z" },
      }),
      names,
    );
    expect(password.sentence).toBe("ha scelto la propria password");
    expect(password.changes).toEqual([]);

    const cleanup = describeEntry(entry({ actorId: null, action: "delete", oldData: companyRow }), {
      ...names,
      companies: new Map(),
    });
    expect(cleanup.actor).toBe("Procedura di manutenzione");
    expect(cleanup.sentence).toBe("ha cancellato la società «Società Inventata Srl»");
  });

  it("dati non più presenti e autori sconosciuti hanno una frase chiara", () => {
    const empty: AuditNames = { people: new Map(), companies: new Map(), brands: new Map() };
    const line = describeEntry(
      entry({ table: "company_brands", newData: { company_id: company, brand_id: brand } }),
      empty,
    );
    expect(line.actor).toBe("un utente non più presente");
    expect(line.sentence).toBe(
      "ha collegato un brand non più presente a una società non più presente",
    );
  });
});

describe("registro dei clienti: dati personali senza valori", () => {
  const customer = "00000000-0000-4000-8000-0000000000d1";
  const base = { id: customer, name: "Cliente Inventato", subject_type: null, is_active: true };

  it("creazione, disattivazione e modifiche con solo nome e tipo in chiaro", () => {
    const names: AuditNames = { people: new Map(), companies: new Map(), brands: new Map() };
    const make = (overrides: Partial<AuditEntry>): AuditEntry => ({
      id: 1,
      occurredAt: "2026-11-04T10:00:00Z",
      actorId: null,
      table: "customers",
      recordId: customer,
      action: "insert",
      oldData: null,
      newData: base,
      ...overrides,
    });
    expect(describeEntry(make({}), names).sentence).toBe(
      "ha creato il cliente «Cliente Inventato»",
    );
    expect(
      describeEntry(
        make({ action: "update", oldData: base, newData: { ...base, is_active: false } }),
        names,
      ).sentence,
    ).toBe("ha disattivato il cliente «Cliente Inventato»");

    const line = describeEntry(
      make({
        action: "update",
        oldData: { ...base, tax_code: null, pec: null, address_street: null },
        newData: {
          ...base,
          name: "Cliente Rinominato",
          subject_type: "private",
          tax_code: "RSSMRA85T10A562S",
          pec: "privato@pec.prova.test",
          address_street: "Via Privata 3",
        },
      }),
      names,
    );
    expect(line.changes).toEqual([
      { label: "Nome o ragione sociale", before: "Cliente Inventato", after: "Cliente Rinominato" },
      { label: "Tipo di soggetto", before: "(vuoto)", after: "Privato" },
      { label: "Codice fiscale" },
      { label: "Via e numero civico" },
      { label: "PEC" },
    ]);
    expect(JSON.stringify(line)).not.toMatch(/RSSMRA|privato@|Via Privata/);
  });
});
