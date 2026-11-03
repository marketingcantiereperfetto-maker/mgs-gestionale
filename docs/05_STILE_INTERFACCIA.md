# Stile dell'interfaccia (riferimento dalle schermate di esempio)

Le schermate di esempio sono indicative: servono per lo stile e la navigazione, non per i campi, che vengono dal documento di architettura.

## Principi
Semplice, pulita, ispirata alle interfacce Apple. Tutto lo schermo ai dati. Un solo colore per le azioni. Italiano, formati italiani.

## Colori e forme
- Sfondo pagina `#f5f5f7`. Schede bianche `#ffffff`, raggio 16px, ombra leggera `0 1px 2px rgba(0,0,0,.06)`, padding 20px.
- Testo principale `#1d1d1f`, secondario `#6e6e73`.
- Azione primaria: pulsante a pillola `#0071e3`, testo bianco, raggio 980px. Azione secondaria: `#e8e8ed`, testo scuro.
- Etichette di stato: informativa `#e8f1fd`/`#0058b0`, riuscito `#e6f6ea`/`#1a6b34`, attenzione `#fff4e5`/`#7a4a00`, errore testo `#b3261e`.
- Campi: bordo 1px `#d2d2d7`, raggio 10px. Contrasto minimo AA.

## Tipografia
Font di sistema: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial`. Titolo pagina 28px peso 600, testo 14px, etichette 13px in grigio.

## Barra del menu in alto
- Fissa, altezza 46px, sfondo `rgba(246,246,248,.94)`, bordo inferiore 1px `#d9d9de`.
- A sinistra «MGS Group» e le voci. A destra la ricerca (pillola, 240px) e l'avatar con le iniziali, con il menu «Esci».
- Voce attiva in grassetto. Passando sopra: sfondo `#e3e3e8`.
- Tendine: si aprono con il mouse e da tastiera (frecce, Esc per chiudere). Larghezza minima 250px, raggio 12px, ombra morbida, voci 14px, riga evidenziata in blu `#0071e3` con testo bianco, separatori sottili. Le scorciatoie da tastiera (grigie a destra) si mostrano solo quando funzionano davvero: per ora nessuna.

## Voci e tendine (capitolo 21 del documento)
Mostrare solo ciò che consente `can()`. Dashboard e Manuali sono voci dirette.
- **Preventivi**: Nuovo preventivo, Tutti, Bozze, Inviati, In trattativa, Vinti, Persi, Richieste di autorizzazione.
- **Ordini**: Tutti, Da incassare, Incassati, Annullati.
- **Catalogo**: Categorie, Wizard (articoli), Materiali, Lavorazioni, Regole di ricarico, Offerte attive.
- **Clienti**: Elenco, Nuovo cliente, Clienti da completare, Consulenti.
- **Statistiche**: Panoramica, Per consulente, Per articolo, Per cliente, Per materiale.
- **Controllo di gestione**: Panoramica, Conto economico, Costi indipendenti, Previsioni, Indicatori e KPI.
- **Impostazioni**: Società e brand, Reparti e macchinari, Utenti e ruoli, Pagamenti, Aliquote e unità di misura, Importazioni.
Le voci delle tendine sono una proposta da rifinire con l'uso.

## Pagine
Titolo (28px) e sottotitolo grigio, contenuto in schede bianche. Stato vuoto informativo: una frase che dice cosa manca e il pulsante dell'azione (per esempio «Nessun cliente inserito» con «Aggiungi cliente»). Una pagina senza dati non mostra mai zero finti.
