# Lavori in ordine di priorità

Ogni lavoro ha un criterio per dire «è fatto». Si lavora dall'alto verso il basso.

## Fase 0: preparazione (vedi `03_CHECKLIST_PREPARAZIONE.md`)
- Conferma delle regole e delle domande aperte con il titolare.
- Casi reali di prova pronti in `docs/riferimenti`.

## Fase 1: fondamenta
1. **Scheletro online.** Progetto, database, rilascio automatico su Vercel, anteprime per ramo, controlli automatici (typecheck, lint, test). *Fatto quando:* l'indirizzo di prova si apre e un push aggiorna l'anteprima.
2. *(Unito il 3 novembre 2026; correzione «password obbligatoria al primo accesso» in revisione, ramo `fase1/giorno-3-password-obbligatoria`.)* **Accesso e ruoli.** Login solo su invito, 5 modelli di ruolo forniti dal software (titolare, consulente, responsabile, amministrazione cataloghi, amministrazione economica), ogni utente collegato a una o più società, controllo centrale dei permessi. Primo titolare creato con un comando dopo conferma. *Fatto quando:* un consulente non vede costi e margini e nessun invitato entra senza aver scelto la propria password.
3. *(In revisione, ramo `fase1/giorno-4-guscio`: menu, stile e pagine segnaposto; i test nel browser per ruolo nel ramo `fase1/giorno-4-test-ruoli`, seconda richiesta di unione.)* **Guscio dell'app.** Menu fisso in alto con tendine, ricerca, utente, stato vuoto informativo. *Fatto quando:* tutte le voci aprono pagine segnaposto.
4. *(In corso: società, conti, brand e loghi uniti; registro e nome del profilo uniti; percorso guidato in revisione, ramo `fase1/giorno-5-percorso-guidato`.)* **Impostazioni: società e brand.** Archivio vuoto all'avvio, percorso guidato di configurazione. Più conti bancari per società con uno predefinito; logo sul brand, logo di riserva sulla società. *Fatto quando:* si crea la prima società con IBAN e un brand associato.
5. *(In corso: A1 anagrafica e A2 maschera «Aggiungi cliente», simili e doppioni uniti; B referenti, indirizzi di consegna e ricerca per email in revisione, ramo `fase1/clienti-b`; poi C dashboard e percorso guidato.)* **Clienti.** Anagrafica con campi parziali, indicatore «completa per fatturazione», pulsante AGGIUNGI CLIENTE, controllo duplicati, campo «società del gruppo» (quale). *Fatto quando:* si crea un cliente con solo il nome.
6. **Registro delle modifiche** su configurazioni e dati economici. *(Avviato con il giorno 3; esteso a conti, brand e collegamenti con il giorno 5; pagina «Impostazioni → Registro delle modifiche» per il titolare, con filtri e storico nelle schede.)*

7b. **Pulizia dei vecchi loghi** (più avanti): un pulsante per il titolare che elenca i loghi non più usati da brand e società e li cancella dall'archivio dopo conferma.

5c. **Completezza dei clienti nel database** (quando i clienti saranno centinaia): calcolare «completa per fatturazione» nel database, così dashboard ed elenco «da completare» non leggono tutte le anagrafiche.

5b. **Anonimizzazione dei dati personali dei privati su richiesta** (più avanti, da definire con il commercialista): procedura per il titolare che rende anonimi i dati personali di un cliente privato mantenendo intatti i documenti già emessi.

## Fase 1b: archivi
7. Fornitori, categorie, materiali (a misura e a pezzo), lavorazioni con opzioni e basi di calcolo.
8. Regole di ricarico (base, categoria, fornitore, eccezione articolo) con anteprima.
9. Importazione da Excel con anteprima, errori chiari, nessun duplicato al secondo caricamento.

## Fase 2: prezzi, Wizard e preventivo
10. Motore dei prezzi (modulo puro) con i **casi reali come test**.
11. Wizard: blocchi, gradi di libertà, regole, simulatore, bozza/prova/pubblicato, versioni.
12. Preventivo: testata, righe, omaggi e upsell, totale e ripartizione, soglie e autorizzazioni, stati, PDF.
13. Pilota con 2-3 consulenti in parallelo al sistema attuale. *Prima di iniziare:* passaggio ai piani a pagamento di Vercel e Supabase, creazione del progetto Supabase di produzione, **servizio email SMTP aziendale** collegato a Supabase e **modelli delle email in italiano** (invito, recupero password) con il link a `/auth/conferma`.

## Fasi successive (solo titoli)
Ordini e pagamenti a rate, incassi automatici · Controllo di gestione (conto economico, costi indipendenti, previsioni, KPI) · Kit misti e abbigliamento · Manuali e chat.
