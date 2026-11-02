# Lavori in ordine di priorità

Ogni lavoro ha un criterio per dire «è fatto». Si lavora dall'alto verso il basso.

## Fase 0: preparazione (vedi `03_CHECKLIST_PREPARAZIONE.md`)
- Conferma delle regole e delle domande aperte con il titolare.
- Casi reali di prova pronti in `docs/riferimenti`.

## Fase 1: fondamenta
1. **Scheletro online.** Progetto, database, rilascio automatico su Vercel, anteprime per ramo, controlli automatici (typecheck, lint, test). *Fatto quando:* l'indirizzo di prova si apre e un push aggiorna l'anteprima.
2. **Accesso e ruoli.** Login, ruoli (titolare, consulente, responsabile, amministrazione cataloghi, amministrazione economica), controllo centrale dei permessi. *Fatto quando:* un consulente non vede costi e margini.
3. **Guscio dell'app.** Menu fisso in alto con tendine, ricerca, utente, stato vuoto informativo. *Fatto quando:* tutte le voci aprono pagine segnaposto.
4. **Impostazioni: società e brand.** Archivio vuoto all'avvio, percorso guidato di configurazione. *Fatto quando:* si crea la prima società con IBAN e un brand associato.
5. **Clienti.** Anagrafica con campi parziali, indicatore «completa per fatturazione», pulsante AGGIUNGI CLIENTE, controllo duplicati. *Fatto quando:* si crea un cliente con solo il nome.
6. **Registro delle modifiche** su configurazioni e dati economici.

## Fase 1b: archivi
7. Fornitori, categorie, materiali (a misura e a pezzo), lavorazioni con opzioni e basi di calcolo.
8. Regole di ricarico (base, categoria, fornitore, eccezione articolo) con anteprima.
9. Importazione da Excel con anteprima, errori chiari, nessun duplicato al secondo caricamento.

## Fase 2: prezzi, Wizard e preventivo
10. Motore dei prezzi (modulo puro) con i **casi reali come test**.
11. Wizard: blocchi, gradi di libertà, regole, simulatore, bozza/prova/pubblicato, versioni.
12. Preventivo: testata, righe, omaggi e upsell, totale e ripartizione, soglie e autorizzazioni, stati, PDF.
13. Pilota con 2-3 consulenti in parallelo al sistema attuale.

## Fasi successive (solo titoli)
Ordini e pagamenti a rate, incassi automatici · Controllo di gestione (conto economico, costi indipendenti, previsioni, KPI) · Kit misti e abbigliamento · Manuali e chat.
