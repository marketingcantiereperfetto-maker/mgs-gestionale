# Gestionale MGS Group

Gestionale web per MGS Group: clienti, preventivi con Wizard configurabili, ordini, pagamenti a rate, controllo di gestione.

Progetto nuovo, scritto da zero. Nessun codice proviene dal lavoro precedente.

## Dove si trova cosa

- `CLAUDE.md`: istruzioni permanenti per Claude Code. Si legge a ogni sessione.
- `docs/ARCHITETTURA_v5.docx`: documento di architettura. **Fonte di verità funzionale.**
- `docs/00_PROMPT_AVVIO.md`: testo da incollare nella prima sessione.
- `docs/01_DECISIONI.md`: registro delle decisioni. Si aggiorna a ogni traguardo.
- `docs/02_BACKLOG.md`: lavori in ordine di priorità, con criteri di accettazione.
- `docs/03_CHECKLIST_PREPARAZIONE.md`: cosa preparare prima di iniziare.
- `docs/riferimenti/`: Excel, preventivi reali, schermate di esempio, listini.

## Struttura prevista del progetto

```
mgs-gestionale/
  CLAUDE.md
  README.md
  .nvmrc                 versione di Node fissata
  docs/
  src/
    app/                 pagine e menu
    components/          interfaccia
    domain/              regole di business, senza dipendenze dal database
      pricing/           motore dei prezzi (con test sui casi reali)
      wizard/            configurazione degli articoli
      quotes/ orders/ payments/ management/
    server/              accessi, permessi, comandi al database
    lib/                 utilità comuni (importi, date, formati italiani)
  supabase/migrations/   modifiche al database (CLI Supabase, solo in avanti)
  tests/                 unit/  golden/ (casi reali)  e2e/
  scripts/               importazioni da Excel
  .github/workflows/     controlli automatici
```

## Come avviarlo sul computer

Serve Node 26 (vedi `.nvmrc`). Dalla cartella del progetto:

```bash
npm install
npm run dev
```

Poi apri http://localhost:3000.

Controlli prima di ogni commit: `npm run check` (tipi, stile, formattazione, test).
Test nel browser: `npm run test:e2e` (la prima volta: `npx playwright install chromium`).
