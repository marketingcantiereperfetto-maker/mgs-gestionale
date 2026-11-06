# Gestionale MGS Group

Gestionale web per MGS Group: clienti, preventivi con Wizard configurabili, ordini, pagamenti a rate, controllo di gestione.

Progetto nuovo, scritto da zero. Nessun codice proviene dal lavoro precedente.

## Dove si trova cosa

- `CLAUDE.md`: istruzioni permanenti per Claude Code. Si legge a ogni sessione.
- `docs/ARCHITETTURA_v6.docx`: documento di architettura. **Fonte di verità funzionale.**
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

Database: `npm run db:status` (migrazioni applicate), `npm run db:push` (applica le nuove al database collegato).
Pulizia del database di prova: `npm run prova:cancella -- --societa "NOME ESATTO" --brand "NOME ESATTO" --cliente "NOME ESATTO"` mostra cosa cancellerebbe (società, brand e clienti di dati inventati, con conti, collegamenti e loghi); con `--conferma` cancella. Si rifiuta di girare se il progetto non è quello di prova; il registro delle modifiche non si tocca.
Primo titolare: `npm run utenti:crea-titolare -- --email nome@dominio.it --sito https://mgs-gestionale.vercel.app` (prova senza effetti; con `--conferma` crea l'invito e stampa nel Terminale il link personale, valido 1 ora, da non copiare in chat).
### Prove sul Supabase locale (T0)
Tutte le prove con database girano su un Supabase locale in Docker, mai sul cloud. Serve Docker Desktop aperto.

- `npm run db:locale:avvia` avvia il Supabase locale di questo progetto (porte 58320–58329: API 58321, database 58322, Studio 58323 spento, posta di prova 58324). `npm run db:locale:ferma` lo ferma. Non toccare gli altri contenitori.
- `npm run test:db`: azzera il database locale (archivi vuoti, migrazioni da zero), poi le prove pgTAP di `supabase/tests/database` e le prove di `tests/integration`. Conta le prove dichiarate (`plan(N)`) e fallisce se ne girano meno; anomalie in `logs/prove-database.log`.
- `npm run test:e2e`: azzera il database locale e lancia le prove nel browser (la prima volta: `npx playwright install chromium`). Un solo accesso per ruolo a ogni giro (`tests/e2e/accessi.setup.ts`, sessioni salvate in `playwright/.auth/`, fuori da git); utenti dedicati solo dove la prova cambia l'utente. Si può indicare un file: `npm run test:e2e -- tests/e2e/invite.spec.ts`.
- I comandi rifiutano qualsiasi indirizzo che non sia `127.0.0.1:58321` / `58322` e non leggono `.env.local`.
- `npm run prova:cloud` (a mano, non a ogni richiesta): controlla che il progetto cloud di prova abbia le stesse impostazioni del locale (iscrizioni chiuse, password di almeno 12 caratteri, limiti dei loghi). Rifiuta ogni altro progetto.
- Le prove usano valori unici (codice casuale) e cercano le righe per identificativo, mai per testo.
