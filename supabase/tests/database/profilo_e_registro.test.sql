-- Nome del profilo e lettura del registro: ognuno cambia solo il proprio nome, mai il ruolo o
-- altri campi; nomi ed email degli autori li legge chi legge il registro (titolare e
-- amministrazione economica, decisione del 6 novembre 2026).
-- Tutto avviene in una transazione annullata alla fine: nel database non resta nulla.
begin;
-- Il comando di test entra con un ruolo ridotto: si lavora come postgres, come le migrazioni.
set local role postgres;
set local search_path = public, extensions;

select plan(14);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e2', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e3', 'economica@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'owner'),
  ('00000000-0000-4000-8000-0000000000e2', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000e3', 'finance_admin');

-- Consulente: cambia il proprio nome, nient'altro.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
select lives_ok(
  $$update public.profiles set full_name = 'Anna Bianchi' where user_id = '00000000-0000-4000-8000-0000000000e2'$$,
  'il consulente cambia il proprio nome'
);
select throws_ok(
  $$update public.profiles set role = 'owner' where user_id = '00000000-0000-4000-8000-0000000000e2'$$,
  '42501', null, 'il consulente non si cambia il ruolo'
);
select throws_ok(
  $$update public.profiles set is_active = true, password_set_at = now() where user_id = '00000000-0000-4000-8000-0000000000e2'$$,
  '42501', null, 'il consulente non cambia stato né segno della password'
);
select throws_ok(
  $$update public.profiles set full_name = 'Anna', role = 'owner' where user_id = '00000000-0000-4000-8000-0000000000e2'$$,
  '42501', null, 'nemmeno insieme al nome'
);
with changed as (
  update public.profiles set full_name = 'Nome falso'
  where user_id = '00000000-0000-4000-8000-0000000000e1' returning 1
)
select is((select count(*)::int from changed), 0, 'il consulente non cambia il nome degli altri');
select throws_ok(
  $$update public.profiles set full_name = '  spazi  ' where user_id = '00000000-0000-4000-8000-0000000000e2'$$,
  '23514', null, 'il nome si salva senza spazi in eccesso'
);
select throws_ok(
  $$select * from public.audit_actor_labels(array['00000000-0000-4000-8000-0000000000e1']::uuid[])$$,
  '42501', null, 'il consulente non legge le email degli autori'
);
select is((select count(*)::int from public.audit_log), 0, 'il consulente non legge il registro');

-- Amministrazione economica: legge il registro e, con la pagina del registro (decisione del
-- 6 novembre 2026), anche i nomi degli autori.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}', true);
select ok((select count(*) from public.audit_log) > 0, 'l''amministrazione economica legge il registro');
select is(
  (select count(*)::int from public.audit_actor_labels(array['00000000-0000-4000-8000-0000000000e1']::uuid[])),
  1, 'l''amministrazione economica legge i nomi degli autori del registro'
);

-- Titolare: nomi ed email.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select results_eq(
  $$select full_name, email from public.audit_actor_labels(array[
      '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2']::uuid[])
    order by email$$,
  $$values ('Anna Bianchi'::text, 'consulente@prova.test'::text), (null, 'titolare@prova.test')$$,
  'il titolare legge nomi ed email degli autori'
);

-- Chi non è collegato: la funzione non è eseguibile.
set local role anon;
select throws_ok(
  $$select * from public.audit_actor_labels(array['00000000-0000-4000-8000-0000000000e1']::uuid[])$$,
  '42501', null, 'chi non è collegato non esegue la funzione delle email'
);

-- Registro: il cambio di nome è annotato con autore e momento.
set local role postgres;
select ok(
  exists (select 1 from public.audit_log where table_name = 'profiles' and action = 'update'
    and actor_id = '00000000-0000-4000-8000-0000000000e2'
    and new_data ->> 'full_name' = 'Anna Bianchi'),
  'il cambio di nome è nel registro'
);
select ok(
  not has_function_privilege('anon', 'public.audit_actor_labels(uuid[])', 'execute'),
  'la funzione delle email non è concessa a chi non è collegato'
);

select * from finish();
rollback;
