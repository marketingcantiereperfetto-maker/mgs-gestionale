# Stato dell'ambiente al passaggio a Claude Code (2 novembre 2026)

## Computer di sviluppo (Mac)
- macOS, Git 2.50.1, Node v24.22.0 (`.nvmrc` = 24), npm 11.19.1, Docker 29.9.2 con motore acceso, Python 3.9.6.
- Non installati: pnpm, GitHub CLI (gh), Supabase CLI, Vercel CLI. Claude Code non rilevato nel PATH al momento del controllo.
- Identità Git (nome ed email) non impostata: serve prima del primo commit.
- La cartella è già un repository Git (ramo `main`), senza commit.

## Servizi
- **Supabase**: organizzazione «Gestionale MGS Group», progetto «GestionaleMgsGroup's Project» (ref `rozukexrurbadsiznmby`), regione eu-west-1 (UE), PostgreSQL 17, creato il 2026-11-02, vuoto. Chiavi e password NON sono nel repository.
- **Vercel**: account collegato, nessun team visibile. Il progetto del gestionale va creato e collegato al repository.
- **GitHub**: repository privato `mgs-gestionale` da creare; nessun remote configurato.

## Avvertenze
- Il lavoro precedente (CP Gestionale 2.0 e laboratori Codex) non fa parte di questo progetto: nessun codice va riusato.
- Docker contiene contenitori preesistenti dei vecchi laboratori: non usarli e non toccarli. Il database locale di prova, se serve, va creato a parte.
- Nessun segreto in chat, nel codice o nei documenti. Le variabili vanno in `.env.local` (escluso da Git) e nelle impostazioni di Vercel e Supabase.

## Prossimo passo
Aprire Claude Code in questa cartella e seguire `docs/00_PROMPT_AVVIO.md`.
