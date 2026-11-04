# Registro delle decisioni

Aggiornare a ogni traguardo. Una decisione cambiata non si cancella: si aggiunge la nuova con la data e il motivo.

## Prodotto (dal documento di architettura v5)
- Un solo Wizard per ogni articolo del catalogo, composto da materiali e lavorazioni. Non esistono «prodotti» come archivio separato.
- Gli Standard sono Wizard con blocchi bloccati; i kit sono Wizard con componenti (anche misti, un solo livello nella 1.0).
- Le varianti sono lavorazioni a scelta; a prezzo 0 se non incidono, sempre registrate.
- Ogni materiale, qualunque unità: prezzo da ricarico o prezzo scritto, fisso o a scaglioni. Scaglioni sul totale della voce nella riga.
- Regole di ricarico per tutti, categoria o fornitore. Prevale la più specifica; il fornitore prevale sulla categoria.
- Quantità intermedie: prezzo dello scaglione inferiore diviso i suoi pezzi, per i pezzi richiesti. Avviso di disallineamento in compilazione.
- Offerte senza date: attive o non attive.
- Soglia di sicurezza calcolata dal costo con coefficiente. Sotto soglia: avviso e richiesta di autorizzazione.
- Prezzo modificabile per riga e come prezzo totale ripartito sulle righe.
- Preventivo Vinto diventa Ordine. Costi sempre definitivi. Incasso automatico dalle condizioni di pagamento (rate).
- Archivi vuoti al primo avvio. Tutto configurabile dalla dashboard.
- Conto economico riclassificato e previsioni nella prima versione. Costi indipendenti dal venduto assegnati prima a società e poi a brand. Imposte con aliquota per società.
- Menu in alto fisso con tendine. Stile semplice, ispirato alle interfacce Apple.

## Tecniche
- Progetto nuovo da zero; nessun codice dal lavoro precedente. Stesse piattaforme: GitHub, Supabase, Vercel (nuovi progetti dedicati).
- Sicurezza semplice: permessi sul server, RLS di base, registro delle modifiche. Nessun gateway personalizzato.
- Importi con NUMERIC e libreria decimale. Motore dei prezzi come modulo puro con test sui casi reali.

## Decise il 2 novembre 2026 (risposte del titolare all'avvio)
- **Node 26** (LTS attiva dal 28 ottobre 2026, predefinita su Vercel). Sostituisce la 24 indicata in `.nvmrc` all'avvio.
- **Ruoli:** 5 modelli forniti dal software (titolare, consulente, responsabile commerciale, amministrazione cataloghi, amministrazione economica). Facoltà personalizzate sul singolo utente in una fase successiva. Ogni utente è collegato a una o più società già dal primo rilascio dell'accesso.
- **Primo accesso:** solo su invito, nessuna registrazione libera. Il primo titolare si crea con un comando, dopo conferma, e imposta la password dal link ricevuto per email.
- **Costi dei servizi:** piani gratuiti di Vercel e Supabase per la prova. **Prima del pilota si passa ai piani a pagamento** (il piano Hobby di Vercel non ammette uso commerciale; Supabase gratuito sospende i progetti inattivi).
- **Ambienti:** un solo progetto Supabase di prova adesso (usato da `main` e dalle anteprime, solo dati inventati); un progetto di produzione separato prima del pilota.
- **Scadenza del preventivo:** impostazione modificabile dall'amministrazione, nessun valore nel codice (supera i «7 giorni» del §12.1).
- **Soglia di sicurezza:** tutti gli articoli hanno una composizione (un articolo semplice è un materiale). La soglia di riga è sempre la somma delle soglie delle voci. Un kit con prezzo promozionale non può scendere sotto la somma delle soglie dei componenti. Il §11.3 del documento sarà corretto dal titolare.
- **Società:** più conti bancari per società, uno predefinito che compare sul PDF. Per creare una società basta la ragione sociale; per emettere preventivi servono partita IVA, codice fiscale, sede legale, email e un IBAN se si usa il bonifico. Il logo è del brand; la società può avere un logo di riserva.
- **Migrazioni:** strada standard di Supabase (cartella `supabase/migrations` e CLI ufficiale), solo in avanti. Ogni migrazione va prima sul database di prova; copia di sicurezza prima di toccare la produzione. Sostituisce la regola «migrazioni reversibili in `db/migrations`».
- **Clienti società del gruppo:** l'anagrafica clienti avrà un campo che indica se il cliente è una società del gruppo e quale (serve a escludere le vendite interne dal conto di Gruppo, §25.4).
- **Materiali di riferimento:** il titolare li mette in `docs/riferimenti` prima della Fase 2, con i nomi dei clienti anonimizzati.

## Decise il 3 novembre 2026 (accesso e ruoli, approvate dal titolare)
- **Costi:** li vedono titolare, amministrazione economica e amministrazione cataloghi (che li inserisce, §20.1).
- **Margini:** li vedono titolare e amministrazione economica. Responsabile commerciale e consulente non vedono né costi né margini; un eventuale permesso sul singolo utente (per esempio il margine «con autorizzazione» del §24) arriverà più avanti.
- **Registro delle modifiche:** lo leggono titolare e amministrazione economica. Le righe non si modificano né si cancellano.
- **Gestione utenti e impostazioni:** solo il titolare, per ora.
- **Gestione del catalogo** (materiali, lavorazioni, Wizard): facoltà distinta, dell'amministrazione cataloghi; separata da utenti e impostazioni. Il titolare la ha anche lui, come primo amministratore (§20.2).
- **Società:** il titolare agisce su tutte le società; gli altri ruoli solo su quelle a cui sono collegati.
- **Password:** almeno 12 caratteri.
- **Tecnica:** tabella società minima (solo ragione sociale) creata ora per collegare gli utenti; i dati completi arrivano con le Impostazioni (backlog 4).
- **Primo titolare senza email:** Supabase non permette di cambiare i modelli delle email senza un SMTP aziendale. Il comando `npm run utenti:crea-titolare` (con `--conferma`) crea l'invito e stampa nel Terminale il link a `/auth/conferma`, valido 1 ora; il link non va mai mostrato in chat.
- **Conferma dell'invito:** aprire il link non verifica nulla; il codice si usa solo dopo il clic su «Attiva l'account» (protegge dai programmi che aprono i link da soli).
- **Password scelta solo dall'utente (correzione dopo la prova del primo titolare):** l'invito non assegna nessuna password; il comando lo verifica e si ferma se l'utente invitato ne ha una. Il profilo ha il segno «password scelta» (`password_set_at`): finché è vuoto, chi è collegato vede solo `/imposta-password`. Il segno si scrive solo dopo il salvataggio della password e solo se nel sistema di accesso risulta davvero una password salvata: chiamare la funzione a mano non basta. I profili già esistenti partono senza segno: il titolare sceglie la password ancora una volta.
- **Messaggi di /imposta-password:** errori distinti in italiano (password uguale a quella attuale, troppo debole o corta, sessione scaduta, errore generico).
- **Password uguale a quella attuale:** nessun percorso speciale. Su /imposta-password si chiede sempre una password diversa da quella salvata; il profilo non viene segnato «password scelta» in questo caso (deciso dal titolare il 3 novembre 2026).

## Decise il 3 novembre 2026 (guscio dell'app, giorno 4)
- **Voci del menu per ruolo — proposta provvisoria, da rivedere quando arrivano i dati:**
  - Tutti: Dashboard, Preventivi, Ordini, Clienti, Statistiche, Manuali (il filtro sui contenuti arriverà con i dati, per esempio il consulente vede solo i propri risultati).
  - Catalogo: tutti; chi non gestisce il catalogo vede solo «Wizard (articoli)» e «Offerte attive» (catalogo commerciale, §21.1). Categorie, materiali, lavorazioni e regole di ricarico: titolare e amministrazione cataloghi.
  - Controllo di gestione: titolare e amministrazione economica.
  - Impostazioni: solo il titolare.
  - «Richieste di autorizzazione» e «Consulenti»: titolare e responsabile commerciale.
- **Permessi anche sul server:** ogni pagina controlla `can()`; chi apre a mano l'indirizzo di una sezione non consentita torna alla dashboard con un avviso.
- **Scorciatoie da tastiera:** non si mostrano nelle tendine finché non funzionano (aggiornato `05_STILE_INTERFACCIA.md`).
- **Formati:** gli importi si formattano da testo decimale esatto, senza arrotondare (gli arrotondamenti restano nel motore dei prezzi); punto delle migliaia sempre presente (1.234,50 €).
- **Contrasto:** il blu delle azioni come testo si usa solo su schede bianche, non sullo sfondo grigio della pagina (sotto il 4,5:1).

## Decise il 3 novembre 2026 (società e brand, giorno 5)
- **Gestione:** solo il titolare crea e modifica società, brand e conti (permesso `companies.manage`), controllato sul server e dalle regole del database.
- **Nessuna cancellazione:** società, brand e conti si disattivano e riattivano (campo «attiva»). Gli elenchi nascondono le voci disattivate; ogni cambio finisce nel registro. Così si conserva l'attribuzione storica (§3).
- **Società:** per crearla basta la ragione sociale. Gli altri campi sono facoltativi, ma se compilati devono essere validi. Sede legale: via e numero, CAP, comune, provincia, paese; niente PEC né codice SDI (il documento non li chiede). Il paese non ha un valore predefinito: «Italia» si sceglie con un clic e si salva solo così.
- **Controlli:** partita IVA di 11 cifre con cifra di controllo; codice fiscale di 16 caratteri (persone, con carattere di controllo) oppure di 11 cifre (società, con cifra di controllo); IBAN di qualunque paese con cifre di controllo; email nel formato corretto.
- **Pronta per emettere preventivi:** servono partita IVA, codice fiscale, sede legale completa ed email; l'IBAN serve se si usa il bonifico (segnalato finché i metodi di pagamento non esistono).
- **Conti bancari:** più conti per società, uno solo predefinito (quello del PDF). Il primo conto attivo diventa predefinito da solo. Il conto predefinito non si disattiva finché ce ne sono altri attivi: prima se ne sceglie un altro. Se si disattiva l'unico conto, la società resta senza predefinito; un conto riattivato diventa predefinito se non ce n'è un altro.
- **Brand e società:** collegamento molti-a-molti. Il logo è del brand; la società può avere un logo di riserva.
- **Loghi:** archivio file di Supabase privato, letto con indirizzi firmati a breve scadenza. Solo PNG, JPEG o WebP fino a 1 MB: il tipo si controlla dal contenuto vero del file, e gli stessi limiti valgono anche sull'archivio. Carica solo il titolare.
- **Registro delle modifiche:** pagina «Impostazioni → Registro delle modifiche», solo per il titolare (per ora l'amministrazione economica non ha la pagina, pur potendo leggere il registro).
- **Test che cancellano dati:** usano la chiave di amministrazione solo sul progetto Supabase di prova (riferimento `rozukexrurbadsiznmby`) e si rifiutano di partire su qualunque altro progetto. Mai su produzione. Creano solo dati inventati e li cancellano alla fine; le righe del registro su quei dati restano.
- **Avatar:** iniziali del nome del profilo; se manca, le prime due lettere dell'email.
- **Doppio invio (dopo la prova della richiesta n. 8):** ogni modulo si blocca durante l'invio (pulsante disabilitato con testo d'attesa, secondo invio rifiutato) e conferma l'esito con un messaggio breve, annunciato ai lettori di schermo. Ogni creazione porta una chiave unica nel database, così un invio ripetuto non crea doppioni. Lo stesso IBAN non può comparire due volte sulla stessa società («Questo conto è già presente»). Regola aggiunta a `CLAUDE.md`.
- **Società con lo stesso nome:** ammesse (la chiave di creazione ferma solo il doppio invio).

## Decise il 3 novembre 2026 (brand e loghi, parte B del giorno 5)
- **Partita IVA unica:** due società non possono avere la stessa partita IVA quando è compilata, contando anche le disattivate («Esiste già una società con questa partita IVA»).
- **Nome del brand unico**, senza differenze di maiuscole e spazi, anche tra i disattivati («Esiste già un brand con questo nome…»).
- **Collegamento brand ↔ società:** si gestisce dalla scheda del brand; togliere un collegamento lo fa sparire (resta nel registro). La scheda avvisa, senza bloccare, se il brand resta senza società.
- **Loghi:** il nome del file sull'archivio è sempre generato dal server (codice casuale + estensione del tipo riconosciuto), mai preso da quello dell'utente. Un logo sostituito resta nell'archivio privato; il brand punta al nuovo. Il logo di riserva della società usa lo stesso meccanismo.
- **Limite di invio dei loghi:** Next.js permette di alzare il limite solo per tutte le azioni insieme; per questo il caricamento passa da un indirizzo dedicato (`/api/loghi`) con il suo limite (1 MB di file), mentre le altre azioni restano a 1 MB. L'indirizzo accetta solo richieste dal gestionale stesso.
- **Stato dopo il salvataggio (dopo la prova della richiesta n. 9):** la schermata mostra sempre i dati salvati, senza ricaricare. Il difetto delle spunte dei collegamenti (salvate ma mostrate vuote) e quello del paese (mostrato come scritto, non come salvato) sono corretti; regola aggiunta a `CLAUDE.md`.
- **Indirizzi firmati dei loghi:** scadono in 5 minuti e non finiscono mai nel registro, nei messaggi di errore o nei log.

## Decise il 3 novembre 2026 (registro, profilo e percorso guidato, parte C del giorno 5)
- **Registro delle modifiche, chi lo legge (conferma della regola del 3 novembre):** nel database lo leggono titolare e amministrazione economica, come già deciso; la pagina «Impostazioni → Registro delle modifiche» è solo del titolare, controllata sul server. Motivo: la regola era già approvata, oggi nessun utente ha il ruolo di amministrazione economica, e il database è pronto per quando quel ruolo avrà la sua pagina.
- **Registro in italiano semplice:** chi, quando e cosa («Francesco ha creato la società X»); delle modifiche si mostrano solo i campi cambiati. Mai campi tecnici, percorsi dei file o indirizzi firmati dei loghi; l'IBAN appare mascherato. Le operazioni senza autore (procedure di pulizia sul database di prova) appaiono come «Procedura di manutenzione».
- **Registro, filtri e pagine:** periodo (giornate intere in ora di Roma, anche nei giorni del cambio d'ora), persona e tipo di dato; 50 righe per pagina, ordinate per data e identificativo, con paginazione «dopo questa riga».
- **Nome del profilo:** ognuno scrive il proprio nome dal menu utente («Il mio profilo»), facoltativo, fino a 80 caratteri. Il permesso nel database vale solo per la colonna del nome e solo sul proprio profilo: nessuno può cambiarsi ruolo o altri campi, nemmeno chiamando il database direttamente. Se il nome manca, il registro mostra l'email, letta da una funzione che risponde solo al titolare.
- **Percorso guidato (C2):** lo vede e lo calcola solo il titolare; gli altri ruoli ricevono la frase fissa «La configurazione iniziale la cura il titolare» senza lettura di dati. Quattro passi calcolati sui dati veri (società; dati completi di tutte le società attive; conto attivo per tutte; almeno un brand attivo collegato a una società attiva, con le società senza brand come sola informazione); gli altri passi del §5.1 «arriverà» (utenti e ruoli: il titolare c'è già, l'invito degli altri arriverà). Si leggono solo conteggi e al massimo 5 nomi («e altre N»). La prova nel browser gira da sola e per ultima, e si salta dicendolo se trova dati non di prova.

## Decise il 4 novembre 2026 (clienti, backlog 5, cap. 16)
- **Chi vede e chi modifica i clienti:** vedono e creano titolare, responsabile commerciale, consulente e amministrazione economica; modificano i dati gli stessi ruoli; disattivano e riattivano solo titolare e responsabile commerciale; il campo «società del gruppo» lo cambiano solo titolare e amministrazione economica. **L'amministrazione cataloghi non ha nessun accesso ai clienti**, nemmeno in lettura. Controllo sul server con `can()` e regole nel database.
- **Le consulenti vedono tutti i clienti**, non solo i propri. Motivo: la futura consulente assegnata (§16.5) serve per attribuzione e statistiche, non per limitare la visibilità. Limiti mantenuti: l'elenco mostra solo nome, tipo, comune e completezza; codice fiscale, email e telefono si vedono solo nella scheda del singolo cliente; nessuna esportazione di massa per le consulenti (solo il titolare, quando arriverà); ogni modifica finisce nel registro con l'autore.
- **Scheda del cliente per le consulenti (precisazione del 4 novembre 2026):** le consulenti vedono e modificano tutti i dati del cliente nella scheda (partita IVA, codice fiscale, indirizzo, PEC…). Motivo: i clienti li comunicano alle consulenti, che devono poter controllare se un collega li ha inseriti bene. Il limite sui dati personali riguarda il registro (che le consulenti non leggono), non la scheda.
- **Ricerca nell'elenco clienti** per nome, partita IVA, codice fiscale e PEC; i risultati mostrano comunque solo nome, tipo, comune e completezza. L'email dei clienti non esiste come campo dell'anagrafica (§16.2: l'email è dei referenti): entrerà nella ricerca con i referenti.
- **Autore nella scheda:** «Creato da … il … · Ultima modifica di … il …», per chi ha accesso ai clienti. Chi e quando sono colonne del cliente scritte dal database (non dal registro); il nome viene da una funzione protetta che restituisce solo nome o email degli autori dei clienti, nient'altro dei profili.
- **Per salvare basta il nome o la ragione sociale;** gli altri campi sono facoltativi ma, se compilati, validi (partita IVA e codice fiscale con controllo, codice destinatario di 7 caratteri, codice ufficio PA di 6, PEC, CAP e provincia per l'Italia, nazione). Nessun valore predefinito, nemmeno il tipo di soggetto.
- **«Completa per fatturazione», per tipo:** sempre sede legale completa (via, CAP, comune, nazione; provincia per l'Italia), recapito della fattura elettronica e regime IVA. Azienda: partita IVA e codice destinatario o PEC. Professionista: partita IVA, codice fiscale e codice destinatario o PEC. Privato: codice fiscale (il codice destinatario è 0000000 da sé). Pubblica Amministrazione: codice fiscale, codice ufficio (che è il suo recapito), nome ufficio e scelta sullo split payment. Estero: identificativo fiscale estero e nazione diversa dall'Italia (codice XXXXXXX da sé). Con la sola PEC il codice destinatario vale 0000000.
- **Regime IVA:** ordinario, esente con natura (natura in testo libero finché il commercialista non conferma i codici), reverse charge, dichiarazione d'intento con numero e data.
- **Doppioni di partita IVA o codice fiscale:** avviso con conferma esplicita («È un cliente diverso»); blocco se coincidono anche il codice ufficio PA. Nessuna fusione automatica. Clienti simili per nome con `pg_trgm` (schema `extensions`), solo per chi vede i clienti, al massimo 5 risultati con solo nome e comune.
- **Dati personali nel registro:** per i clienti compaiono con il valore solo nome e tipo; per tutti gli altri campi solo il nome del campo cambiato («ha cambiato il codice fiscale»), mai il valore.
- **Arriveranno, senza campi finti:** codice cliente (con la numerazione), condizione di pagamento predefinita e banca/IBAN del cliente (con i pagamenti), consulente assegnata e rapporto per società (§16.1, §16.5).
- **Richieste di unione:** A1 anagrafica (tabella, permessi, controlli, indicatore, elenco, scheda); A2 maschera «Aggiungi cliente» riutilizzabile, accessibile (focus bloccato nella finestra, Esc chiude, il focus torna al pulsante), clienti simili e doppioni; B referenti e indirizzi di consegna; C clienti da completare in dashboard e nel percorso guidato.

## Aperte (da decidere prima della funzione relativa)
- Arrotondamenti: prima del motore dei prezzi.
- Numerazione preventivi e ordini, «Duplica per», taglie come righe o note: prima dei Wizard.
- Articolo inserito al volo dal preventivo: subito utilizzabile o in bozza.
- Stati dell'ordine; valori di aliquote, coefficiente di soglia e quota di spedizione interna: più avanti.
- Finestra storica e soglia minima di storico per le previsioni.
