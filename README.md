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
I test in `tests/integration` usano il database di prova di `.env.local`; senza quel file vengono saltati.

Database: `npm run db:status` (migrazioni applicate), `npm run db:push` (applica le nuove al database collegato).
Test nel browser per ruolo: `npm run test:e2e` crea un utente di prova temporaneo per ogni ruolo (indirizzi `e2e-…@prova.test`, password solo in memoria), lo usa e lo cancella alla fine. Servono le variabili di `.env.local`; senza, quei test vengono saltati.
Pulizia del database di prova: `npm run prova:cancella -- --societa "NOME ESATTO" --brand "NOME ESATTO" --cliente "NOME ESATTO"` mostra cosa cancellerebbe (società, brand e clienti di dati inventati, con conti, collegamenti e loghi); con `--conferma` cancella. Si rifiuta di girare se il progetto non è quello di prova; il registro delle modifiche non si tocca.
Test del database: `npm run test:db` controlla senza rete che il progetto sia quello di prova (si rifiuta altrimenti). Se in `.env.local` c'è `SUPABASE_DB_URL` (indirizzo diretto del database di prova, con password, da inserire a mano) le prove si collegano direttamente e non dipendono dal servizio di gestione di Supabase; altrimenti usano il progetto collegato alla CLI. Dettagli: (prove in `supabase/tests/database` sul database di prova, dentro una transazione annullata: non lascia dati). Il comando conta le prove dichiarate (`plan(N)` di ogni file) e fallisce se ne girano meno; ogni file ha 60 secondi al massimo (`PROVE_DB_TEMPO_MASSIMO` per cambiarli) e l'avvio 120: chi non risponde viene nominato. Prove lente (oltre 20 secondi), senza risposta o mancanti si annotano in `logs/prove-database.log` (solo sul proprio computer).
Primo titolare: `npm run utenti:crea-titolare -- --email nome@dominio.it --sito https://mgs-gestionale.vercel.app` (prova senza effetti; con `--conferma` crea l'invito e stampa nel Terminale il link personale, valido 1 ora, da non copiare in chat).
Test nel browser: `npm run test:e2e` (la prima volta: `npx playwright install chromium`).
