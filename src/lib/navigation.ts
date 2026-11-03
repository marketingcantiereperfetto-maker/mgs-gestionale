import type { Action } from "@/server/auth/permissions";

// Voci del menu in alto (cap. 21.1 e docs/05_STILE_INTERFACCIA.md). Ogni voce che apre una
// pagina ha anche il testo della pagina segnaposto: nessun dato, solo cosa arriverà e quando.
export type NavPage = {
  label: string;
  href: string;
  title: string;
  subtitle: string;
  emptyState: string;
  requires?: Action;
};

export type NavSection = {
  label: string;
  base: string;
  requires?: Action;
  // Voce diretta: una sola pagina, nessuna tendina.
  page?: NavPage;
  // Tendina: gruppi separati da una linea sottile.
  groups?: NavPage[][];
};

const quotesLater = "I preventivi arriveranno con la Fase 2, dopo catalogo e motore dei prezzi.";
const ordersLater = "Gli ordini arriveranno dopo i preventivi: un preventivo vinto diventa ordine.";
const catalogLater = "Gli archivi del catalogo arriveranno con la Fase 1b.";
const customersLater = "L'anagrafica clienti arriverà al termine della Fase 1.";
const statsLater = "Le statistiche arriveranno quando ci saranno preventivi e ordini.";
const controlLater =
  "Il controllo di gestione arriverà in una fase successiva, con ordini e incassi.";

export const navigation: NavSection[] = [
  {
    label: "Dashboard",
    base: "/",
    page: {
      label: "Dashboard",
      href: "/",
      title: "Dashboard",
      subtitle: "Collegamenti rapidi, attività da completare e indicatori.",
      emptyState:
        "Non ci sono ancora dati da mostrare. La dashboard di primo avvio guiderà la configurazione iniziale a partire da società e brand.",
    },
  },
  {
    label: "Preventivi",
    base: "/preventivi",
    groups: [
      [
        {
          label: "Nuovo preventivo",
          href: "/preventivi/nuovo",
          title: "Nuovo preventivo",
          subtitle: "Configura gli articoli con il Wizard e prepara il preventivo.",
          emptyState: quotesLater,
        },
      ],
      [
        {
          label: "Tutti",
          href: "/preventivi",
          title: "Preventivi",
          subtitle: "Tutti i preventivi, di ogni stato.",
          emptyState: `Nessun preventivo inserito. ${quotesLater}`,
        },
      ],
      [
        {
          label: "Bozze",
          href: "/preventivi/bozze",
          title: "Preventivi in bozza",
          subtitle: "Preventivi non ancora inviati al cliente.",
          emptyState: `Nessun preventivo in bozza. ${quotesLater}`,
        },
        {
          label: "Inviati",
          href: "/preventivi/inviati",
          title: "Preventivi inviati",
          subtitle: "Preventivi inviati al cliente in attesa di risposta.",
          emptyState: `Nessun preventivo inviato. ${quotesLater}`,
        },
        {
          label: "In trattativa",
          href: "/preventivi/in-trattativa",
          title: "Preventivi in trattativa",
          subtitle: "Preventivi su cui la trattativa è aperta.",
          emptyState: `Nessun preventivo in trattativa. ${quotesLater}`,
        },
        {
          label: "Vinti",
          href: "/preventivi/vinti",
          title: "Preventivi vinti",
          subtitle: "Preventivi accettati, diventati ordini.",
          emptyState: `Nessun preventivo vinto. ${quotesLater}`,
        },
        {
          label: "Persi",
          href: "/preventivi/persi",
          title: "Preventivi persi",
          subtitle: "Preventivi non accettati dal cliente.",
          emptyState: `Nessun preventivo perso. ${quotesLater}`,
        },
      ],
      [
        {
          label: "Richieste di autorizzazione",
          href: "/preventivi/autorizzazioni",
          title: "Richieste di autorizzazione",
          subtitle: "Prezzi sotto la soglia di sicurezza da approvare.",
          emptyState: `Nessuna richiesta di autorizzazione. ${quotesLater}`,
          requires: "approvals.view",
        },
      ],
    ],
  },
  {
    label: "Ordini",
    base: "/ordini",
    groups: [
      [
        {
          label: "Tutti",
          href: "/ordini",
          title: "Ordini",
          subtitle: "Tutti gli ordini, di ogni stato.",
          emptyState: `Nessun ordine. ${ordersLater}`,
        },
      ],
      [
        {
          label: "Da incassare",
          href: "/ordini/da-incassare",
          title: "Ordini da incassare",
          subtitle: "Ordini con rate ancora da incassare.",
          emptyState: `Nessun ordine da incassare. ${ordersLater}`,
        },
        {
          label: "Incassati",
          href: "/ordini/incassati",
          title: "Ordini incassati",
          subtitle: "Ordini incassati per intero.",
          emptyState: `Nessun ordine incassato. ${ordersLater}`,
        },
        {
          label: "Annullati",
          href: "/ordini/annullati",
          title: "Ordini annullati",
          subtitle: "Ordini annullati dopo la conferma.",
          emptyState: `Nessun ordine annullato. ${ordersLater}`,
        },
      ],
    ],
  },
  {
    label: "Catalogo",
    base: "/catalogo",
    groups: [
      [
        {
          label: "Categorie",
          href: "/catalogo/categorie",
          title: "Categorie",
          subtitle: "La classificazione degli articoli del catalogo.",
          emptyState: `Nessuna categoria inserita. ${catalogLater}`,
          requires: "catalog.manage",
        },
        {
          label: "Wizard (articoli)",
          href: "/catalogo/wizard",
          title: "Wizard (articoli)",
          subtitle: "Gli articoli del catalogo, ciascuno con il suo Wizard.",
          emptyState: "Nessun articolo pubblicato. I Wizard arriveranno con la Fase 2.",
        },
        {
          label: "Materiali",
          href: "/catalogo/materiali",
          title: "Materiali",
          subtitle: "Materiali a misura e a pezzo, con costi e prezzi.",
          emptyState: `Nessun materiale inserito. ${catalogLater}`,
          requires: "catalog.manage",
        },
        {
          label: "Lavorazioni",
          href: "/catalogo/lavorazioni",
          title: "Lavorazioni",
          subtitle: "Lavorazioni con opzioni e basi di calcolo.",
          emptyState: `Nessuna lavorazione inserita. ${catalogLater}`,
          requires: "catalog.manage",
        },
      ],
      [
        {
          label: "Regole di ricarico",
          href: "/catalogo/regole-di-ricarico",
          title: "Regole di ricarico",
          subtitle: "Ricarichi per tutti, per categoria, per fornitore o per articolo.",
          emptyState: `Nessuna regola di ricarico. ${catalogLater}`,
          requires: "catalog.manage",
        },
        {
          label: "Offerte attive",
          href: "/catalogo/offerte",
          title: "Offerte attive",
          subtitle: "Le offerte attive in questo momento.",
          emptyState: "Nessuna offerta attiva. Le offerte arriveranno con i Wizard, nella Fase 2.",
        },
      ],
    ],
  },
  {
    label: "Clienti",
    base: "/clienti",
    groups: [
      [
        {
          label: "Elenco",
          href: "/clienti",
          title: "Clienti",
          subtitle: "L'anagrafica dei clienti.",
          emptyState: `Nessun cliente inserito. ${customersLater}`,
        },
        {
          label: "Nuovo cliente",
          href: "/clienti/nuovo",
          title: "Nuovo cliente",
          subtitle: "Basta il nome: gli altri dati si completano dopo.",
          emptyState: customersLater,
        },
      ],
      [
        {
          label: "Clienti da completare",
          href: "/clienti/da-completare",
          title: "Clienti da completare",
          subtitle: "Clienti a cui mancano i dati per la fatturazione.",
          emptyState: `Nessun cliente da completare. ${customersLater}`,
        },
        {
          label: "Consulenti",
          href: "/clienti/consulenti",
          title: "Consulenti",
          subtitle: "I clienti assegnati a ciascun consulente.",
          emptyState: `Nessun cliente assegnato. ${customersLater}`,
          requires: "consultants.view",
        },
      ],
    ],
  },
  {
    label: "Statistiche",
    base: "/statistiche",
    groups: [
      [
        {
          label: "Panoramica",
          href: "/statistiche",
          title: "Statistiche",
          subtitle: "Panoramica dei risultati commerciali.",
          emptyState: `Nessun dato da analizzare. ${statsLater}`,
        },
      ],
      [
        {
          label: "Per consulente",
          href: "/statistiche/consulenti",
          title: "Statistiche per consulente",
          subtitle: "Risultati di ciascun consulente.",
          emptyState: `Nessun dato da analizzare. ${statsLater}`,
        },
        {
          label: "Per articolo",
          href: "/statistiche/articoli",
          title: "Statistiche per articolo",
          subtitle: "Risultati per articolo del catalogo.",
          emptyState: `Nessun dato da analizzare. ${statsLater}`,
        },
        {
          label: "Per cliente",
          href: "/statistiche/clienti",
          title: "Statistiche per cliente",
          subtitle: "Risultati per cliente.",
          emptyState: `Nessun dato da analizzare. ${statsLater}`,
        },
        {
          label: "Per materiale",
          href: "/statistiche/materiali",
          title: "Statistiche per materiale",
          subtitle: "Risultati per materiale.",
          emptyState: `Nessun dato da analizzare. ${statsLater}`,
        },
      ],
    ],
  },
  {
    label: "Controllo di gestione",
    base: "/controllo-di-gestione",
    requires: "management_control.view",
    groups: [
      [
        {
          label: "Panoramica",
          href: "/controllo-di-gestione",
          title: "Controllo di gestione",
          subtitle: "Panoramica economica del Gruppo e delle società.",
          emptyState: `Nessun dato economico. ${controlLater}`,
        },
      ],
      [
        {
          label: "Conto economico",
          href: "/controllo-di-gestione/conto-economico",
          title: "Conto economico",
          subtitle: "Conto economico riclassificato per società e brand.",
          emptyState: `Nessun dato economico. ${controlLater}`,
        },
        {
          label: "Costi indipendenti",
          href: "/controllo-di-gestione/costi-indipendenti",
          title: "Costi indipendenti",
          subtitle: "Costi non legati al venduto, assegnati a società e brand.",
          emptyState: `Nessun costo inserito. ${controlLater}`,
        },
        {
          label: "Previsioni",
          href: "/controllo-di-gestione/previsioni",
          title: "Previsioni",
          subtitle: "Previsioni calcolate dallo storico.",
          emptyState: `Nessuno storico disponibile. ${controlLater}`,
        },
        {
          label: "Indicatori e KPI",
          href: "/controllo-di-gestione/indicatori",
          title: "Indicatori e KPI",
          subtitle: "Gli indicatori principali dell'attività.",
          emptyState: `Nessun dato da misurare. ${controlLater}`,
        },
      ],
    ],
  },
  {
    label: "Impostazioni",
    base: "/impostazioni",
    requires: "settings.manage",
    groups: [
      [
        {
          label: "Società e brand",
          href: "/impostazioni/societa-e-brand",
          title: "Società e brand",
          subtitle: "Società del Gruppo, conti bancari e brand.",
          emptyState: "Nessuna società inserita.",
          requires: "companies.manage",
        },
        {
          label: "Reparti e macchinari",
          href: "/impostazioni/reparti-e-macchinari",
          title: "Reparti e macchinari",
          subtitle: "Reparti produttivi e macchinari.",
          emptyState: `Nessun reparto inserito. ${catalogLater}`,
        },
        {
          label: "Utenti e ruoli",
          href: "/impostazioni/utenti-e-ruoli",
          title: "Utenti e ruoli",
          subtitle: "Account, ruoli e società collegate.",
          emptyState:
            "La gestione degli utenti dal gestionale arriverà in un passo successivo; per ora gli inviti si preparano con un comando.",
          requires: "users.manage",
        },
      ],
      [
        {
          label: "Pagamenti",
          href: "/impostazioni/pagamenti",
          title: "Pagamenti",
          subtitle: "Metodi e condizioni di pagamento, con le rate.",
          emptyState: "Nessuna condizione di pagamento inserita. Arriveranno prima dei preventivi.",
        },
        {
          label: "Aliquote e unità di misura",
          href: "/impostazioni/aliquote-e-unita",
          title: "Aliquote e unità di misura",
          subtitle: "Aliquote IVA e unità di misura usate nel catalogo.",
          emptyState: `Nessuna aliquota né unità di misura inserita. ${catalogLater}`,
        },
        {
          label: "Registro delle modifiche",
          href: "/impostazioni/registro-delle-modifiche",
          title: "Registro delle modifiche",
          subtitle: "Chi ha cambiato cosa, e quando.",
          emptyState: "Nessuna modifica registrata.",
          requires: "audit_log.view",
        },
        {
          label: "Importazioni",
          href: "/impostazioni/importazioni",
          title: "Importazioni",
          subtitle: "Caricamento di archivi da Excel con anteprima.",
          emptyState: `Nessuna importazione eseguita. ${catalogLater}`,
        },
      ],
    ],
  },
  {
    label: "Manuali",
    base: "/manuali",
    page: {
      label: "Manuali",
      href: "/manuali",
      title: "Manuali",
      subtitle: "Guide per funzionalità, operazione e ruolo.",
      emptyState:
        "Nessun manuale pubblicato. I manuali arriveranno insieme alle funzioni che spiegano.",
    },
  },
];

export const searchPage: NavPage = {
  label: "Cerca",
  href: "/cerca",
  title: "Cerca",
  subtitle: "Clienti, preventivi, ordini e articoli.",
  emptyState:
    "Non c'è ancora nulla da cercare. La ricerca funzionerà quando ci saranno clienti, preventivi e articoli.",
};

// Il proprio profilo: dal menu utente, per tutti.
export const profilePage: NavPage = {
  label: "Il mio profilo",
  href: "/profilo",
  title: "Il mio profilo",
  subtitle: "Il nome con cui compari nel gestionale e nel registro delle modifiche.",
  emptyState: "",
};

type Allowed = (action: Action) => boolean;

function isAllowed(allowed: Allowed, action: Action | undefined): boolean {
  return action === undefined || allowed(action);
}

// Il menu dell'utente: solo le sezioni e le voci consentite; tendine vuote e separatori
// inutili spariscono.
export function visibleNavigation(allowed: Allowed): NavSection[] {
  return navigation.flatMap((section) => {
    if (!isAllowed(allowed, section.requires)) return [];
    if (section.page) return isAllowed(allowed, section.page.requires) ? [section] : [];
    const groups = (section.groups ?? [])
      .map((group) => group.filter((page) => isAllowed(allowed, page.requires)))
      .filter((group) => group.length > 0);
    return groups.length > 0 ? [{ ...section, groups }] : [];
  });
}

export type PageAccess = { page: NavPage; requires: Action[] };

// La pagina che corrisponde a un indirizzo e i permessi che servono per aprirla.
export function findPage(href: string): PageAccess | null {
  if (href === searchPage.href) return { page: searchPage, requires: [] };
  if (href === profilePage.href) return { page: profilePage, requires: [] };
  for (const section of navigation) {
    const pages = section.page ? [section.page] : (section.groups ?? []).flat();
    const page = pages.find((candidate) => candidate.href === href);
    if (page) {
      const requires = [section.requires, page.requires].filter(
        (action): action is Action => action !== undefined,
      );
      return { page, requires };
    }
  }
  return null;
}

export function isActiveSection(section: NavSection, pathname: string): boolean {
  if (section.base === "/") return pathname === "/";
  return pathname === section.base || pathname.startsWith(`${section.base}/`);
}
