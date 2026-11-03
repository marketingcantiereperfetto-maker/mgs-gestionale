-- Protezione dal doppio invio (decisione del 3 novembre 2026): ogni creazione porta una
-- chiave generata dal modulo, unica, così lo stesso invio ripetuto non crea un secondo record.
-- In più lo stesso IBAN non può comparire due volte sulla stessa società: l'IBAN è già
-- salvato normalizzato (senza spazi, maiuscolo), garantito dal controllo di formato.

alter table public.companies add column creation_key uuid unique;
alter table public.company_bank_accounts add column creation_key uuid unique;

alter table public.company_bank_accounts
  add constraint company_bank_accounts_company_iban_key unique (company_id, iban);

grant insert (creation_key) on public.company_bank_accounts to authenticated;
