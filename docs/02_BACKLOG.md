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
5. *(In corso: A1 anagrafica, A2 maschera «Aggiungi cliente», simili e doppioni, B referenti, indirizzi di consegna e ricerca per email uniti; C clienti da completare in dashboard e passo del percorso guidato in revisione, ramo `fase1/clienti-c`.)* **Clienti.** Anagrafica con campi parziali, indicatore «completa per fatturazione», pulsante AGGIUNGI CLIENTE, controllo duplicati, campo «società del gruppo» (quale). *Fatto quando:* si crea un cliente con solo il nome.
6. **Registro delle modifiche** su configurazioni e dati economici. *(Avviato con il giorno 3; esteso a conti, brand e collegamenti con il giorno 5; pagina «Impostazioni → Registro delle modifiche» per il titolare, con filtri e storico nelle schede.)*

7b. **Pulizia dei vecchi loghi** (più avanti): un pulsante per il titolare che elenca i loghi non più usati da brand e società e li cancella dall'archivio dopo conferma.

5c. **Completezza dei clienti nel database** (quando i clienti saranno centinaia): calcolare «completa per fatturazione» nel database, così dashboard, elenco e pagina «da completare» non rileggono le anagrafiche. Fino ad allora il riquadro della dashboard controlla al massimo i primi 500 clienti attivi (`incompleteScanLimit`, un solo punto) e oltre scrive «almeno N» ed «e altri» senza contare.

5b. **Anonimizzazione dei dati personali dei privati su richiesta** (più avanti, da definire con il commercialista): procedura per il titolare che rende anonimi i dati personali di un cliente privato mantenendo intatti i documenti già emessi.

## Fase 2: catalogo, prezzi e Wizard (architettura v6, piano in `06_PIANO_CATALOGO.md`)
*Sostituisce dal 6 novembre 2026 le vecchie voci 7-11 (archivi, ricarico, importazione, motore dei prezzi, Wizard), riscritte secondo la v6.*
- **K0 Permessi per utente** *(K0a database, regole e `can()` unito il 6 novembre 2026; poi K0b pagina «Utenti e ruoli» con le spunte, il cambio di ruolo e le società collegate, oppure K0c per queste ultime due se K0b diventa troppo grande)*: tabella dei permessi con i preset dei cinque ruoli, spunte per utente, permessi sensibili concessi solo dal titolare, `can()` e regole del database sulle facoltà effettive. *Fatto quando:* ogni ruolo con i soli preset si comporta come prima, e un permesso aggiunto o tolto cambia davvero cosa l'utente può fare, anche chiamando il database direttamente.
- *(In revisione, ramo `fase2/t0-prove-locali`.)* **T0 Prove su Supabase locale in Docker** (dopo K0a, prima di K0b): database azzerato a ogni giro, prove che rifiutano il cloud, prove di fumo separate sul cloud, un accesso per ruolo per giro, stesso Supabase locale su GitHub.
- **K1 Archivi semplici e fornitori**, con il campo Categoria cliente sul cliente.
- **Inviti degli utenti dall'interfaccia** (dopo K0): oggi si fanno con il comando; servono anche il servizio email SMTP aziendale e i modelli in italiano (vedi la voce del pilota).
- **K2 Motore dei prezzi, parte 1** (modulo puro): importi, scaglioni a fette progressive, ricarico e regole con precedenza, arrotondamenti.
- **K3 Motore dei prezzi, parte 2**: Multiformato e Tabella, con i **casi reali come test**; revisione del titolare alla fine.
- **K4 Materiali** · **K5 Lavorazioni e servizi** · **K6 Esclusioni** · **K7 Categorie e prodotti** · **K8 Wizard Multiformato** · **K9 Wizard a Tabella e kit** · **K10 Listini** · **K11 Verifica del catalogo**.
- **Importazione da Excel** con anteprima, errori chiari e nessun duplicato al secondo caricamento (§18): da pianificare dentro o dopo K4.
- **Testi da allineare alla v6** (piccolo): la scheda cliente dice ancora che arriverà la «consulente assegnata» e la pagina «Clienti → Consulenti» parla di assegnazioni dei clienti; con la v6 il cliente non ha consulente assegnata (§16.5). Da correggere con K1 o prima.

## Fase 3: preventivo (dopo il catalogo, da pianificare a parte)
12. Preventivo: pop-up del catalogo, Wizard compilabile dalle consulenti, righe di testo, descrizione e prezzo modificabili con soglie e autorizzazioni, listino per riga, foto con spunta, origine obbligatoria, omaggi e upsell, totale e ripartizione, stati, Duplica preventivo, PDF, passaggio a Vinto e ordine. Poi le statistiche sugli acquisti dei clienti.
13. Pilota con 2-3 consulenti in parallelo al sistema attuale. *Prima di iniziare:* passaggio ai piani a pagamento di Vercel e Supabase, creazione del progetto Supabase di produzione, **servizio email SMTP aziendale** collegato a Supabase e **modelli delle email in italiano** (invito, recupero password) con il link a `/auth/conferma`.

## Fasi successive (solo titoli)
Ordini e pagamenti a rate, incassi automatici · Controllo di gestione (conto economico, costi indipendenti, previsioni, KPI) · Kit misti e abbigliamento · Manuali e chat.
