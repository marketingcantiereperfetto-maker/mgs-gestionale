import { describe, expect, it } from "vitest";
import type { CustomerData } from "@/domain/customers/customer";
import {
  incompleteHeadline,
  incompleteOthers,
  summarizeIncomplete,
} from "@/domain/customers/incomplete";

const empty: CustomerData = {
  name: "",
  subjectType: null,
  vatNumber: null,
  taxCode: null,
  foreignTaxId: null,
  addressStreet: null,
  addressPostalCode: null,
  addressCity: null,
  addressProvince: null,
  addressCountry: null,
  sdiCode: null,
  pec: null,
  paOfficeCode: null,
  paOfficeName: null,
  splitPayment: null,
  vatRegime: null,
  vatExemptionNature: null,
  intentDeclarationNumber: null,
  intentDeclarationDate: null,
};

function incomplete(index: number) {
  return {
    ...empty,
    id: `id-${index}`,
    name: `Cliente ${index}`,
    taxCode: "RSSMRA85T10A562S",
    isActive: true,
  };
}

const complete = {
  ...empty,
  id: "id-ok",
  name: "Cliente completo",
  subjectType: "private" as const,
  taxCode: "RSSMRA85T10A562S",
  addressStreet: "Via Prova 1",
  addressPostalCode: "00100",
  addressCity: "Roma",
  addressProvince: "RM",
  addressCountry: "IT",
  vatRegime: "ordinary" as const,
  isActive: true,
};

describe("clienti da completare", () => {
  it("conta solo gli attivi incompleti e mostra i primi 5, solo id e nome", () => {
    const customers = [...[1, 2, 3, 4, 5, 6, 7].map(incomplete), complete];
    const summary = summarizeIncomplete(customers, false);
    expect(summary.total).toBe(7);
    expect(summary.sample).toEqual(
      [1, 2, 3, 4, 5].map((index) => ({ id: `id-${index}`, name: `Cliente ${index}` })),
    );
    expect(incompleteHeadline(summary)).toBe("7 clienti attivi da completare per la fatturazione.");
    expect(incompleteOthers(summary)).toBe("e altri 2");
  });

  it("ignora i disattivati", () => {
    const summary = summarizeIncomplete([{ ...incomplete(1), isActive: false }], false);
    expect(summary.total).toBe(0);
  });

  it("stato vuoto onesto: nessun cliente oppure tutti completi", () => {
    expect(incompleteHeadline(summarizeIncomplete([], false))).toBe(
      "Nessun cliente attivo inserito.",
    );
    const allComplete = summarizeIncomplete([complete], false);
    expect(incompleteHeadline(allComplete)).toBe(
      "Tutti i clienti attivi sono completi per la fatturazione.",
    );
    expect(incompleteOthers(allComplete)).toBeNull();
    expect(incompleteHeadline(summarizeIncomplete([incomplete(1)], false))).toBe(
      "1 cliente attivo da completare per la fatturazione.",
    );
  });

  it("oltre il limite: «almeno» e «e altri» senza numero", () => {
    const summary = summarizeIncomplete([1, 2, 3].map(incomplete), true);
    expect(incompleteHeadline(summary)).toBe(
      "Almeno 3 clienti da completare tra i primi 3 clienti attivi.",
    );
    expect(incompleteOthers(summary)).toBe("e altri");
  });
});
