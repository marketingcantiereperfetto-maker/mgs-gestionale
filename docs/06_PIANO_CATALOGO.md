# Piano del catalogo, dei prezzi e dei Wizard

Data: 6 novembre 2026. Riferimento: `ARCHITETTURA_v6` (capitoli 6, 7, 8, 9, 10, 11, 12.8, 19.6, 20.2, 24). Dove la v6 contraddice la v5, vale la v6.

## Come si lavora (invariato)
- Una richiesta di unione piccola per volta. Prima del codice, il piano in 10 righe, con le scelte da confermare; si aspetta il sì del titolare.
- Nessuna unione senza la conferma del titolare. Se un controllo è rosso, non si invia nulla finché non si è capito il perché.
- Test per ogni regola, con utenti e dati temporanei e pulizia protetta (solo progetto di prova).
- Moduli che dopo il salvataggio mostrano lo stato vero; protezione dal doppio invio e dai doppioni.
- Nel registro delle modifiche nessun dato personale: solo i nomi dei campi cambiati.
- Importi sempre con decimali esatti, mai con la virgola mobile.

## Ordine delle richieste

| Sigla | Cosa | Dimensione | Dipende da |
|---|---|---|---|
| K0 | **Permessi per utente**: tabella dei permessi con preset dei cinque ruoli; spunte per utente; i permessi sensibili li concede solo il titolare; `can()` e RLS leggono le facoltà effettive, non il ruolo. La tabella dei permessi si definisce con il titolare all'inizio della richiesta | M-L | niente |
| K1 | **Archivi semplici e fornitori**: categorie materiale, lavorazione e servizio, famiglie, caratteristiche, origini, categorie cliente (con il campo sul cliente), fornitori con rappresentanti. Schema comune: nome univoco, stato, ordinamento, duplica, elimina solo se mai usato | M | K0 |
| K2 | **Motore dei prezzi, parte 1** (modulo puro, senza interfaccia): importi, scaglioni a fette progressive, ricarico e regole con precedenza, arrotondamenti. Test con gli esempi del documento | M | niente |
| K3 | **Motore dei prezzi, parte 2**: Multiformato (blocchi a misura e a pezzo, unità di calcolo e lati, quantità sommate tra blocchi, avviamento, minimale, servizi, listino, listino barrato, ripartizione del ricavo, costi, soglia) e Tabella libera e automatica (variabili, minimi e multipli, quantità libera, kit). Test sugli esempi 26.2-26.4 e **sui casi reali** del titolare. Alla fine ci si ferma per la revisione | L | K2 |
| K4 | **Materiali**: scheda, prezzo da ricarico o scritto, fisso o a scaglioni, costo con storico, regole di ricarico con anteprima, caratteristiche, foto, duplica | L | K1, K2 |
| K5 | **Lavorazioni e servizi**: schede con opzioni e tipologie, cinque tipi, unità di calcolo e lati, prezzo, omaggio consentito, foto, duplica | L | K4 |
| K6 | **Esclusioni**: anagrafica unica, viste nelle schede, controllo sulle lavorazioni obbligatorie che restano escluse | M | K4, K5 |
| K7 | **Categorie e prodotti**: schede, foto, percentuale di listino, «disponibile per» i brand, parole chiave; il prodotto crea il suo Wizard in PROVA; duplica categoria (con prodotti e Wizard) e prodotto | M | K6 |
| K8 | **Wizard Multiformato**: costruzione (blocchi, materiali per regole e spunte, lavorazioni, servizi, avviamento e minimale, testo guida), simulatore con scomposizione, PROVA, pubblicazione e versioni, duplica Wizard con nuovo prodotto | L | K3, K7 |
| K9 | **Wizard a Tabella e kit**: tabella libera e automatica, variabili, minimi e multipli, quantità per pezzo | L | K8 |
| K10 | **Listini**: anagrafica, regole con precedenza, riservato a clienti, validità, tabelle proprie, prezzi attesi, avviamento e minimale; integrazione nel motore | M | K8 |
| K11 | **Verifica del catalogo**: percorso guidato aggiornato con i nuovi passi, controlli di completezza (prezzi mancanti, Wizard senza materiali, esclusioni che bloccano), manuale breve | S | K10 |

K2 e K3 non toccano l'interfaccia e possono partire subito dopo K0, o anche prima. K4, K5 e K6 si possono invertire, purché K6 venga dopo gli altri due.

**Dopo il catalogo** si pianifica a parte il **preventivo**: pop-up del catalogo, Wizard compilabile dalle consulenti, righe di testo, descrizione e prezzo modificabili con soglie e autorizzazioni, listino per riga, foto con spunta, stati, Duplica preventivo, PDF, passaggio a Vinto e ordine. Vengono poi le statistiche sugli acquisti dei clienti.

## Cosa serve dal titolare, e quando
- **K0**: l'elenco dei permessi si definisce insieme all'inizio della richiesta.
- **K3, prima della revisione**: da 10 a 15 preventivi reali con i prezzi e le tabelle (Ediltelo standard e fuori formato, prezzi al mq a scaglioni, abbigliamento, kit, gadget, servizi). Diventano i casi di prova del motore.
- **K1 e K4**: nomi di fornitori e categorie, e l'elenco dei materiali (anche da Excel) con costi, prezzi e foto.
- **K5**: lavorazioni, opzioni e servizi con costi e prezzi.
- **K7**: categorie e prodotti con le foto.

## Controlli da ripetere a ogni richiesta
- Permessi: controllo sul server e regole del database; test per ogni ruolo, con l'amministrazione cataloghi che può gestire il catalogo e la consulente che non vede costi, margini e soglie.
- Funzioni del database: percorso di ricerca vuoto, controllo interno di chi le chiama, nessun accesso a chi non è collegato.
- Foto: contenuto reale del file, nome generato dal server, 2 MB, archivio privato, indirizzi firmati a breve scadenza, mai nel registro.
- Duplica: nome con «-copia», copia non utilizzabile finché non si attiva; si elimina solo ciò che non è mai stato usato.
- Prezzi: casi del documento più casi reali; un valore mancante non vale mai zero.
- Il database di prova resta pulito dopo i test.

## Stima
Ordine di grandezza per richiesta: S circa mezza giornata, M circa una giornata, L circa due giornate di lavoro di Claude Code, più i tempi di prova del titolare. Al ritmo tenuto finora, il catalogo e i prezzi (K0-K11) richiedono indicativamente da due a tre settimane di calendario. È una stima non verificata: si ricalibra dopo K3.
