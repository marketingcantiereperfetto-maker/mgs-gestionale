-- Autore dei clienti: scritto dal database, non dall'app; la funzione dei nomi restituisce solo
-- nome o email degli autori dei clienti, e solo a chi ha accesso ai clienti.
-- Tutto in una transazione annullata alla fine: nel database non resta nulla.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(9);

-- La riga creata qui ha una chiave di creazione casuale: la prova la ritrova per chiave
-- (identificativo), mai per nome, così altre righe con lo stesso testo non la confondono.
create temporary table chiavi (label text primary key, key uuid not null default gen_random_uuid()) on commit drop;
insert into chiavi (label) values ('Cliente Inventato');
grant select on chiavi to authenticated;
create function pg_temp.key(label text) returns uuid language sql as $$
  select key from chiavi where chiavi.label = key.label;
$$;

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000a7', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a8', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a9', 'cataloghi@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000aa', 'estraneo@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role, full_name) values
  ('00000000-0000-4000-8000-0000000000a7', 'owner', 'Mario Prova'),
  ('00000000-0000-4000-8000-0000000000a8', 'sales_consultant', null),
  ('00000000-0000-4000-8000-0000000000a9', 'catalog_admin', null),
  ('00000000-0000-4000-8000-0000000000aa', 'sales_consultant', 'Mai autore');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a7","role":"authenticated"}', true);
insert into public.customers (name, creation_key) values ('Cliente Inventato', pg_temp.key('Cliente Inventato'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a8","role":"authenticated"}', true);
update public.customers set address_city = 'Comune di Prova' where creation_key = pg_temp.key('Cliente Inventato');

select is(
  (select created_by::text from public.customers where creation_key = pg_temp.key('Cliente Inventato')),
  '00000000-0000-4000-8000-0000000000a7', 'chi ha creato è scritto dal database'
);
select is(
  (select updated_by::text from public.customers where creation_key = pg_temp.key('Cliente Inventato')),
  '00000000-0000-4000-8000-0000000000a8', 'chi ha modificato per ultimo è scritto dal database'
);
select throws_ok(
  $$update public.customers set created_by = '00000000-0000-4000-8000-0000000000aa'$$,
  '42501', null, 'nessuno cambia l''autore a mano'
);
select results_eq(
  $$select label from public.customer_author_names(array[
      '00000000-0000-4000-8000-0000000000a7', '00000000-0000-4000-8000-0000000000a8',
      '00000000-0000-4000-8000-0000000000aa']::uuid[]) order by label$$,
  $$values ('consulente@prova.test'::text), ('Mario Prova'::text)$$,
  'il consulente legge solo nome o email degli autori, non di altri utenti'
);
select is(
  (select count(*)::int from public.customer_author_names(array['00000000-0000-4000-8000-0000000000aa']::uuid[])),
  0, 'chi non ha mai scritto un cliente non compare'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a9","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.customer_author_names(array['00000000-0000-4000-8000-0000000000a7']::uuid[])$$,
  '42501', null, 'l''amministrazione cataloghi non legge i nomi degli autori'
);

set local role anon;
select throws_ok(
  $$select * from public.customer_author_names(array['00000000-0000-4000-8000-0000000000a7']::uuid[])$$,
  '42501', null, 'chi non è collegato non esegue la funzione'
);

set local role postgres;
select ok(
  not has_function_privilege('anon', 'public.customer_author_names(uuid[])', 'execute'),
  'la funzione non è concessa a chi non è collegato'
);
select is(
  (select pg_get_function_result('public.customer_author_names(uuid[])'::regprocedure)),
  'TABLE(user_id uuid, label text)', 'la funzione restituisce solo identificativo e nome'
);

select * from finish();
rollback;
