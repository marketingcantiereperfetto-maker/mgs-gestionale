import {
  brandPath,
  companiesPath,
  companyPath,
  newBrandPath,
  newCompanyPath,
} from "@/lib/company-paths";

// Percorso guidato di configurazione (cap. 5.1, decisioni del 3 novembre 2026). Lo stato di
// ogni passo viene dai dati veri; i passi delle funzioni che non esistono ancora sono
// «arriverà», senza pulsanti.

export const sampleSize = 5;

type Sample<Item> = { total: number; sample: Item[] };
type Named = { id: string; name: string };

export type SetupFacts = {
  activeCompanies: number;
  incomplete: Sample<Named & { missing: string[] }>;
  withoutAccount: Sample<Named>;
  activeBrands: number;
  linkedBrands: number;
  unlinkedBrand: Named | null;
  withoutBrand: Sample<Named>;
};

export type StepStatus = "done" | "todo" | "later";

export type SetupStep = {
  title: string;
  status: StepStatus;
  details: string[];
  action: { label: string; href: string } | null;
};

export const statusLabels: Record<StepStatus, string> = {
  done: "Fatto",
  todo: "Da fare",
  later: "Arriverà",
};

// «Alfa, Beta e altre 2»: al massimo i primi 5 nomi.
function names<Item>(list: Sample<Item>, describe: (item: Item) => string): string {
  const shown = list.sample.slice(0, sampleSize).map(describe);
  const others = list.total - shown.length;
  return others > 0 ? `${shown.join("; ")} e altre ${others}` : shown.join("; ");
}

function companiesStep(facts: SetupFacts): SetupStep {
  const done = facts.activeCompanies > 0;
  return {
    title: "Creare la prima società",
    status: done ? "done" : "todo",
    details: done ? [] : ["Per iniziare basta la ragione sociale."],
    action: done ? null : { label: "Aggiungi società", href: newCompanyPath },
  };
}

function readinessStep(facts: SetupFacts): SetupStep {
  const title = "Completare i dati delle società per emettere preventivi";
  if (facts.activeCompanies === 0) {
    return { title, status: "todo", details: ["Prima crea una società."], action: null };
  }
  if (facts.incomplete.total === 0) return { title, status: "done", details: [], action: null };
  const first = facts.incomplete.sample[0]!;
  return {
    title,
    status: "todo",
    details: [
      `Da completare: ${names(facts.incomplete, (item) => `${item.name} (mancano ${item.missing.join(", ")})`)}.`,
    ],
    action: { label: `Completa ${first.name}`, href: companyPath(first.id) },
  };
}

function accountStep(facts: SetupFacts): SetupStep {
  const title = "Inserire l'IBAN per i bonifici";
  if (facts.activeCompanies === 0) {
    return { title, status: "todo", details: ["Prima crea una società."], action: null };
  }
  if (facts.withoutAccount.total === 0) return { title, status: "done", details: [], action: null };
  const first = facts.withoutAccount.sample[0]!;
  return {
    title,
    status: "todo",
    details: [
      `Senza conto bancario attivo: ${names(facts.withoutAccount, (item) => item.name)}.`,
      "L'IBAN serve se usi il bonifico.",
    ],
    action: { label: `Aggiungi un conto a ${first.name}`, href: companyPath(first.id) },
  };
}

function brandStep(facts: SetupFacts): SetupStep {
  const title = "Aggiungere i brand e collegarli alle società";
  const info =
    facts.withoutBrand.total > 0 && facts.activeCompanies > 0
      ? [`Società senza brand collegato: ${names(facts.withoutBrand, (item) => item.name)}.`]
      : [];
  if (facts.linkedBrands > 0) return { title, status: "done", details: info, action: null };
  if (facts.activeBrands === 0) {
    return {
      title,
      status: "todo",
      details: ["Nessun brand attivo."],
      action: { label: "Aggiungi brand", href: newBrandPath },
    };
  }
  return {
    title,
    status: "todo",
    details: ["Nessun brand attivo è collegato a una società attiva."],
    action: facts.unlinkedBrand
      ? { label: `Collega ${facts.unlinkedBrand.name}`, href: brandPath(facts.unlinkedBrand.id) }
      : { label: "Apri società e brand", href: companiesPath },
  };
}

// Passi del §5.1 che dipendono da funzioni non ancora disponibili.
const laterSteps: { title: string; details?: string[] }[] = [
  { title: "Configurare reparti e macchinari" },
  {
    title: "Creare utenti, ruoli e responsabilità",
    details: ["Il titolare è già attivo; l'invito degli altri utenti arriverà."],
  },
  { title: "Inserire metodi e condizioni di pagamento, aliquote IVA e unità di misura" },
  { title: "Creare o importare le anagrafiche clienti" },
  { title: "Configurare fornitori, categorie, materiali e lavorazioni, poi i Wizard" },
  { title: "Definire regole di ricarico, scaglioni, soglie di sicurezza e regole commerciali" },
  { title: "Verifiche di completezza, simulazioni e pubblicazione degli articoli" },
  { title: "Creare il primo preventivo" },
];

export type SetupGuide = { steps: SetupStep[]; complete: boolean };

export function setupGuide(facts: SetupFacts): SetupGuide {
  const current = [
    companiesStep(facts),
    readinessStep(facts),
    accountStep(facts),
    brandStep(facts),
  ];
  const later: SetupStep[] = laterSteps.map((step) => ({
    title: step.title,
    status: "later",
    details: step.details ?? [],
    action: null,
  }));
  return {
    steps: [...current, ...later],
    complete: current.every((step) => step.status === "done"),
  };
}

export const notOwnerMessage = "La configurazione iniziale la cura il titolare.";
export const completeMessage =
  "La configurazione di società, conti e brand è completa. Gli altri passi arriveranno con le prossime funzioni.";

export type DashboardSetup =
  { kind: "guide"; guide: SetupGuide } | { kind: "message"; text: string };

// Il percorso si calcola solo per chi gestisce società e brand (il titolare): per gli altri la
// frase fissa, senza leggere nessun dato.
export async function dashboardSetup(
  canConfigure: boolean,
  loadFacts: () => Promise<SetupFacts>,
): Promise<DashboardSetup> {
  if (!canConfigure) return { kind: "message", text: notOwnerMessage };
  return { kind: "guide", guide: setupGuide(await loadFacts()) };
}
