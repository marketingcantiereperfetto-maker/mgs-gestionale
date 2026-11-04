-- Clienti: chi vede, crea e modifica; facoltà ristrette (disattivare, società del gruppo);
-- formati; registro. Tutto in una transazione annullata alla fine: nel database non resta nulla.
begin;
-- Il comando di test entra con un ruolo ridotto: si lavora come postgres, come le migrazioni.
set local role postgres;
set local search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000f1', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000f2', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000f3', 'cataloghi@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000f4', 'economica@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000f5', 'responsabile@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000f1', 'owner'),
  ('00000000-0000-4000-8000-0000000000f2', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000f3', 'catalog_admin'),
  ('00000000-0000-4000-8000-0000000000f4', 'finance_admin'),
  ('00000000-0000-4000-8000-0000000000f5', 'sales_manager');
insert into public.companies (id, legal_name) values
  ('00000000-0000-4000-8000-0000000000c9', 'Società Inventata Srl');

create temporary table who (role text primary key, id text) on commit drop;
insert into who values
  ('titolare', '00000000-0000-4000-8000-0000000000f1'),
  ('consulente', '00000000-0000-4000-8000-0000000000f2'),
  ('cataloghi', '00000000-0000-4000-8000-0000000000f3'),
  ('economica', '00000000-0000-4000-8000-0000000000f4'),
  ('responsabile', '00000000-0000-4000-8000-0000000000f5');
grant select on who to authenticated;

-- Clienti già presenti nel database di prova, per confrontare ciò che vede ciascun ruolo.
create temporary table existing on commit drop as select count(*)::int as n from public.customers;
grant select on existing to authenticated;

create function pg_temp.act_as(person text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from who where role = person), 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Consulente: crea con il solo nome e modifica; non disattiva, non indica la società del gruppo.
select pg_temp.act_as('consulente');
select lives_ok(
  $$insert into public.customers (name) values ('Cliente Inventato')$$,
  'il consulente crea un cliente con il solo nome'
);
select lives_ok(
  $$update public.customers set tax_code = 'RSSMRA85T10A562S', subject_type = 'private' where name = 'Cliente Inventato'$$,
  'il consulente modifica i dati'
);
select throws_ok(
  $$update public.customers set is_active = false where name = 'Cliente Inventato'$$,
  '42501', null, 'il consulente non disattiva i clienti'
);
select throws_ok(
  $$update public.customers set group_company_id = '00000000-0000-4000-8000-0000000000c9' where name = 'Cliente Inventato'$$,
  '42501', null, 'il consulente non indica la società del gruppo'
);
select throws_ok(
  $$insert into public.customers (name, group_company_id) values ('Altro', '00000000-0000-4000-8000-0000000000c9')$$,
  '42501', null, 'nemmeno alla creazione'
);
select throws_ok(
  $$update public.customers set pec = 'non-una-pec' where name = 'Cliente Inventato'$$,
  '23514', null, 'una PEC nel formato sbagliato è rifiutata anche dal database'
);
select throws_ok(
  $$delete from public.customers$$,
  '42501', null, 'nessuno cancella i clienti dall''app'
);
select is(
  (select count(*)::int from public.customers), (select n + 1 from existing),
  'il consulente vede tutti i clienti'
);

-- Amministrazione cataloghi: nessun accesso.
select pg_temp.act_as('cataloghi');
select is((select count(*)::int from public.customers), 0, 'l''amministrazione cataloghi non vede i clienti');
select throws_ok(
  $$insert into public.customers (name) values ('Cliente dei cataloghi')$$,
  '42501', null, 'l''amministrazione cataloghi non crea clienti'
);
with changed as (update public.customers set name = 'Cambiato' returning 1)
select is((select count(*)::int from changed), 0, 'l''amministrazione cataloghi non modifica i clienti');

-- Amministrazione economica: società del gruppo sì, disattivare no.
select pg_temp.act_as('economica');
select lives_ok(
  $$update public.customers set group_company_id = '00000000-0000-4000-8000-0000000000c9' where name = 'Cliente Inventato'$$,
  'l''amministrazione economica indica la società del gruppo'
);
select throws_ok(
  $$update public.customers set is_active = false where name = 'Cliente Inventato'$$,
  '42501', null, 'l''amministrazione economica non disattiva'
);

-- Responsabile commerciale: disattiva e riattiva; non la società del gruppo.
select pg_temp.act_as('responsabile');
select lives_ok(
  $$update public.customers set is_active = false where name = 'Cliente Inventato'$$,
  'il responsabile commerciale disattiva'
);
select throws_ok(
  $$update public.customers set group_company_id = null where name = 'Cliente Inventato'$$,
  '42501', null, 'il responsabile commerciale non cambia la società del gruppo'
);

-- Titolare: tutto.
select pg_temp.act_as('titolare');
select lives_ok(
  $$update public.customers set is_active = true, group_company_id = null where name = 'Cliente Inventato'$$,
  'il titolare riattiva e cambia la società del gruppo'
);

-- Chi non è collegato: niente.
set local role anon;
select throws_ok($$select * from public.customers$$, '42501', null, 'chi non è collegato non legge i clienti');

-- Registro: ogni modifica con autore.
set local role postgres;
select ok(
  (select count(*) from public.audit_log where table_name = 'customers' and actor_id is not null) >= 5,
  'le modifiche dei clienti sono nel registro con l''autore'
);

select * from finish();
rollback;
