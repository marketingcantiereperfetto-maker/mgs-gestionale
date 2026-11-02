# Istruzioni di progetto: Gestionale MGS Group

## Chi sono e come lavoriamo
Il titolare del progetto non è uno sviluppatore. Spiega sempre in italiano semplice: cosa hai fatto, come provarlo, cosa resta.
Lavora a **piccoli passi verificabili**. Prima di una modifica ampia, proponi un piano breve e aspetta conferma.
Non dichiarare «fatto» finché typecheck, lint e test non passano e il risultato non funziona davvero in anteprima.

## Fonte di verità
`docs/ARCHITETTURA_v5.docx` descrive cosa deve fare il gestionale. `docs/01_DECISIONI.md` raccoglie le decisioni.
Se la richiesta contraddice i documenti, **fermati e chiedi**: non decidere da solo e non inventare regole di business.
A ogni traguardo aggiorna `01_DECISIONI.md` e `02_BACKLOG.md`.

## Stack (fissato)
Next.js (App Router), TypeScript in modalità strict, Tailwind. PostgreSQL gestito da Supabase (regione UE), Supabase Auth.
Hosting su Vercel. Test con Vitest (unit e casi reali) e Playwright (pochi percorsi chiave). ESLint e Prettier.
Versioni: all'avvio fissale (`.nvmrc`, `package.json` con versioni esatte) dopo averle verificate su fonti ufficiali. Nessun pacchetto superfluo.

## Principi non negoziabili
1. **Nessun prodotto scritto nel codice.** Materiali, lavorazioni, Wizard, categorie, pagamenti, aliquote, unità di misura e regole si configurano dalla dashboard. Nuovo articolo = nessuna modifica al codice.
2. **Archivi vuoti al primo avvio.** Nessun dato aziendale precompilato.
3. **Importi e quantità mai in virgola mobile.** `NUMERIC` nel database e una libreria decimale nel codice; arrotondamenti centralizzati in un solo punto.
4. **Il motore dei prezzi è un modulo puro** (`src/domain/pricing`), senza database, con test sui casi reali in `tests/golden`. Nessuna modifica ai calcoli senza aggiornare i test.
5. **I documenti emessi non cambiano.** Preventivi e ordini conservano configurazione, prezzi e costi del loro momento (fotografia versionata).
6. **Costi sempre definitivi.** Un costo mancante non vale zero: il margine risulta incompleto.
7. **Costi e margini visibili solo ai ruoli autorizzati**, controllati sul server.
8. **Interfaccia in italiano**, formati italiani (euro, date, virgola decimale), fuso Europe/Rome. Menu fisso in alto con tendine, stile semplice e pulito.

## Sicurezza (semplice e solida)
- Ogni azione passa da un controllo centrale dei permessi sul server (`can(utente, azione, ambito)`).
- Row Level Security attiva su tutte le tabelle, con regole semplici, come seconda difesa.
- Registro delle modifiche (chi, quando, cosa) per dati economici e configurazioni.
- Segreti solo in variabili d'ambiente di Vercel e Supabase. Mai nel codice, mai in chat.
- Nessuna operazione in produzione senza conferma esplicita. Nessun comando che cancelli dati senza chiedere.

## Convenzioni di codice
Nomi tecnici in inglese; testi dell'interfaccia in italiano. Glossario:
preventivo=quote, ordine=order, cliente=customer, materiale=material, lavorazione=operation,
Wizard=wizard, categoria=category, società=company, brand=brand, rata=installment,
condizione di pagamento=payment_terms, soglia di sicurezza=safety_threshold.
Una funzione fa una cosa. Commenti solo dove la regola di business non è ovvia, con riferimento al capitolo del documento.
Le modifiche al database sono sempre migrazioni Supabase in `supabase/migrations`, create con la CLI ufficiale, solo in avanti.
Ogni migrazione si applica prima al database di prova; prima di toccare la produzione, copia di sicurezza.

## Flusso di lavoro
Un lavoro = un ramo = una anteprima su Vercel. Il ramo `main` va in ambiente di prova; la produzione si aggiorna solo su richiesta.
Commit piccoli, messaggi chiari in italiano. Prima di chiudere un lavoro: typecheck, lint, test, e una breve nota su come provarlo.
