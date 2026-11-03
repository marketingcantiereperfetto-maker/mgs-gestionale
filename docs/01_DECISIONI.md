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

## Aperte (da decidere prima della funzione relativa)
- Arrotondamenti: prima del motore dei prezzi.
- Numerazione preventivi e ordini, «Duplica per», taglie come righe o note: prima dei Wizard.
- Articolo inserito al volo dal preventivo: subito utilizzabile o in bozza.
- Stati dell'ordine; valori di aliquote, coefficiente di soglia e quota di spedizione interna: più avanti.
- Finestra storica e soglia minima di storico per le previsioni.
