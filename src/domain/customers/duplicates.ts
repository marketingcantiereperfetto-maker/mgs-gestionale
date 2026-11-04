// Doppioni di partita IVA o codice fiscale (decisioni del 4 novembre 2026): avviso con casella
// «È un cliente diverso»; blocco se coincide anche il codice ufficio PA. Nei messaggi non
// compaiono mai codici fiscali o partite IVA: solo nome e comune dell'altro cliente.

export type DuplicateCandidate = {
  name: string;
  city: string | null;
  sameVatNumber: boolean;
  sameTaxCode: boolean;
  sameOfficeCode: boolean;
};

export type DuplicateDecision =
  { kind: "ok" } | { kind: "block"; message: string } | { kind: "confirm"; message: string };

function who(candidate: DuplicateCandidate): string {
  return candidate.city ? `«${candidate.name}» (${candidate.city})` : `«${candidate.name}»`;
}

function subject(candidates: DuplicateCandidate[]): string {
  const vat = candidates.some((candidate) => candidate.sameVatNumber);
  const tax = candidates.some((candidate) => candidate.sameTaxCode);
  if (vat && tax) return "questa partita IVA o questo codice fiscale";
  return vat ? "questa partita IVA" : "questo codice fiscale";
}

export function decideDuplicates(
  candidates: DuplicateCandidate[],
  confirmedDifferent: boolean,
): DuplicateDecision {
  const matching = candidates.filter(
    (candidate) => candidate.sameVatNumber || candidate.sameTaxCode,
  );
  if (matching.length === 0) return { kind: "ok" };

  const blocking = matching.filter((candidate) => candidate.sameOfficeCode);
  if (blocking.length > 0) {
    return {
      kind: "block",
      message: `Esiste già un cliente con ${subject(blocking)} e lo stesso codice ufficio: ${blocking.map(who).join(", ")}. Non si può salvare un doppione.`,
    };
  }
  if (confirmedDifferent) return { kind: "ok" };
  return {
    kind: "confirm",
    message: `Esiste già un cliente con ${subject(matching)}: ${matching.map(who).join(", ")}. Se è un cliente diverso, spunta «È un cliente diverso» e salva di nuovo.`,
  };
}
