import { describe, expect, it, vi } from "vitest";
import {
  completeMessage,
  dashboardSetup,
  notOwnerMessage,
  setupGuide,
  type SetupFacts,
} from "@/domain/setup/steps";

const empty: SetupFacts = {
  activeCompanies: 0,
  incomplete: { total: 0, sample: [] },
  withoutAccount: { total: 0, sample: [] },
  activeBrands: 0,
  linkedBrands: 0,
  unlinkedBrand: null,
  withoutBrand: { total: 0, sample: [] },
};
const alfa = { id: "00000000-0000-4000-8000-0000000000a1", name: "Alfa Srl" };

const statuses = (facts: SetupFacts) => setupGuide(facts).steps.map((step) => step.status);

describe("percorso guidato (cap. 5.1)", () => {
  it("archivio vuoto: quattro passi da fare, gli altri arriveranno", () => {
    const guide = setupGuide(empty);
    expect(statuses(empty)).toEqual(["todo", "todo", "todo", "todo", ...Array(8).fill("later")]);
    expect(guide.complete).toBe(false);
    expect(guide.steps[0]!.action).toEqual({
      label: "Aggiungi società",
      href: "/impostazioni/societa-e-brand/societa/nuova",
    });
    // Senza società i passi che ne dipendono non hanno pulsanti finti.
    expect(guide.steps[1]!.action).toBeNull();
    expect(guide.steps[1]!.details).toEqual(["Prima crea una società."]);
    expect(guide.steps.slice(4).every((step) => step.action === null)).toBe(true);
  });

  it("i passi arriverà seguono il §5.1, e il titolare risulta già attivo", () => {
    const later = setupGuide(empty).steps.filter((step) => step.status === "later");
    expect(later.map((step) => step.title)).toContain("Creare utenti, ruoli e responsabilità");
    expect(later.find((step) => step.title.startsWith("Creare utenti"))!.details).toEqual([
      "Il titolare è già attivo; l'invito degli altri utenti arriverà.",
    ]);
    expect(later.at(-1)!.title).toBe("Creare il primo preventivo");
  });

  it("società incompleta: dice cosa manca e porta alla sua scheda", () => {
    const facts: SetupFacts = {
      ...empty,
      activeCompanies: 1,
      incomplete: { total: 1, sample: [{ ...alfa, missing: ["partita IVA", "email"] }] },
      withoutAccount: { total: 1, sample: [alfa] },
    };
    const [created, ready, account] = setupGuide(facts).steps;
    expect(created!.status).toBe("done");
    expect(ready!.details).toEqual(["Da completare: Alfa Srl (mancano partita IVA, email)."]);
    expect(ready!.action).toEqual({
      label: "Completa Alfa Srl",
      href: `/impostazioni/societa-e-brand/societa/${alfa.id}`,
    });
    expect(account!.details[0]).toBe("Senza conto bancario attivo: Alfa Srl.");
  });

  it("al massimo 5 nomi, poi «e altre N»", () => {
    const sample = Array.from({ length: 5 }, (_, index) => ({ id: `${index}`, name: `S${index}` }));
    const facts: SetupFacts = {
      ...empty,
      activeCompanies: 7,
      withoutAccount: { total: 7, sample },
    };
    expect(setupGuide(facts).steps[2]!.details[0]).toBe(
      "Senza conto bancario attivo: S0; S1; S2; S3; S4 e altre 2.",
    );
  });

  it("brand: aggiungere, poi collegare; le società senza brand sono solo un'informazione", () => {
    const base = { ...empty, activeCompanies: 2 };
    expect(setupGuide(base).steps[3]!.action!.label).toBe("Aggiungi brand");
    const unlinked = { ...base, activeBrands: 1, unlinkedBrand: { id: "b1", name: "Beta" } };
    expect(setupGuide(unlinked).steps[3]!.action!.label).toBe("Collega Beta");
    const linked = {
      ...base,
      activeBrands: 1,
      linkedBrands: 1,
      withoutBrand: { total: 1, sample: [alfa] },
    };
    const step = setupGuide(linked).steps[3]!;
    expect(step.status).toBe("done");
    expect(step.details).toEqual(["Società senza brand collegato: Alfa Srl."]);
  });

  it("tutto fatto: percorso completo", () => {
    const facts = { ...empty, activeCompanies: 1, activeBrands: 1, linkedBrands: 1 };
    expect(statuses(facts).slice(0, 4)).toEqual(["done", "done", "done", "done"]);
    expect(setupGuide(facts).complete).toBe(true);
    expect(completeMessage).not.toMatch(/!|🎉|complimenti/i);
  });

  it("per chi non è titolare la frase fissa, senza leggere nessun dato", async () => {
    const loadFacts = vi.fn(async () => empty);
    expect(await dashboardSetup(false, loadFacts)).toEqual({
      kind: "message",
      text: notOwnerMessage,
    });
    expect(loadFacts).not.toHaveBeenCalled();
    expect((await dashboardSetup(true, loadFacts)).kind).toBe("guide");
    expect(loadFacts).toHaveBeenCalledTimes(1);
  });
});
