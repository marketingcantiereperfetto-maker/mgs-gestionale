-- Regole di società e conti bancari: scrive solo il titolare, un solo conto predefinito,
-- il predefinito non si disattiva se ce ne sono altri, ogni modifica va nel registro.
-- Tutto avviene in una transazione annullata alla fine: nel database non resta nulla.
begin;
-- Il comando di test entra con un ruolo ridotto: si lavora come postgres, come le migrazioni.
set local role postgres;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a2', 'consulente@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner'),
  ('00000000-0000-4000-8000-0000000000a2', 'sales_consultant');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

-- Consulente: non crea società.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.companies (legal_name) values ('Società inventata del consulente')$$,
  '42501', null, 'il consulente non crea società'
);

-- Titolare: crea la società con la sola ragione sociale.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$with c as (insert into public.companies (legal_name) values ('Società Inventata Srl') returning id)
    insert into ids select 'company', id from c$$,
  'il titolare crea una società con la sola ragione sociale'
);
select throws_ok(
  $$insert into public.companies (legal_name, vat_number) values ('X', '123')$$,
  '23514', null, 'una partita IVA nel formato sbagliato è rifiutata anche dal database'
);

-- Conti: il primo diventa predefinito da solo, il secondo no.
select lives_ok(
  $$with a as (insert into public.company_bank_accounts (company_id, iban)
      select id, 'IT60X0542811101000000123456' from ids where name = 'company' returning id)
    insert into ids select 'first', id from a$$,
  'il titolare aggiunge il primo conto'
);
select lives_ok(
  $$with a as (insert into public.company_bank_accounts (company_id, iban)
      select id, 'DE89370400440532013000' from ids where name = 'company' returning id)
    insert into ids select 'second', id from a$$,
  'il titolare aggiunge il secondo conto'
);
select is((select is_default from public.company_bank_accounts where id = (select id from ids where name = 'first')), true, 'il primo conto è predefinito');
select is((select is_default from public.company_bank_accounts where id = (select id from ids where name = 'second')), false, 'il secondo conto non è predefinito');

-- Il predefinito non si disattiva finché c'è un altro conto attivo.
select throws_ok(
  $$select public.set_bank_account_active((select id from ids where name = 'first'), false)$$,
  'P0001', 'Scegli prima un altro conto predefinito', 'il predefinito non si disattiva se ci sono altri conti'
);

-- Cambio di predefinito: uno solo alla volta.
select lives_ok($$select public.set_default_bank_account((select id from ids where name = 'second'))$$, 'il titolare cambia il predefinito');
select is(
  (select count(*)::int from public.company_bank_accounts
    where company_id = (select id from ids where name = 'company') and is_default),
  1, 'resta un solo conto predefinito'
);

-- Il conto non predefinito si disattiva; riattivato non ruba il predefinito.
select lives_ok($$select public.set_bank_account_active((select id from ids where name = 'first'), false)$$, 'il conto non predefinito si disattiva');
select lives_ok($$select public.set_bank_account_active((select id from ids where name = 'first'), true)$$, 'e si riattiva');
select is((select is_default from public.company_bank_accounts where id = (select id from ids where name = 'first')), false, 'riattivato non diventa predefinito se ce n''è già uno');

-- Consulente: non tocca i conti.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.set_default_bank_account((select id from ids where name = 'first'))$$,
  '42501', null, 'il consulente non cambia il conto predefinito'
);
select throws_ok(
  $$delete from public.companies$$,
  '42501', null, 'nessuno cancella le società dall''app'
);

-- Registro: ogni modifica ha autore e momento.
set local role postgres;
select ok(
  (select count(*) from public.audit_log
    where table_name in ('companies', 'company_bank_accounts')
      and actor_id = '00000000-0000-4000-8000-0000000000a1'
      and occurred_at is not null) >= 7,
  'il registro contiene le modifiche del titolare con chi e quando'
);

select * from finish();
rollback;
