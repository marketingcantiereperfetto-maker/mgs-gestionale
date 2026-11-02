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

## Aperte (da decidere prima della funzione relativa)
- Valori di aliquote, coefficiente di soglia e quota di spedizione interna.
- Finestra storica e soglia minima di storico per le previsioni.
- «Duplica per» del gestionale attuale: significato. Taglie come righe o note nella prima fase.
- Articolo inserito al volo dal preventivo: subito utilizzabile o in bozza.
- Numerazione preventivi e ordini; stati dell'ordine.
