-- Permessi per utente (K0a): preset dei ruoli identici a prima, eccezioni aggiunte e tolte che
-- cambiano davvero cosa si può fare (anche chiamando il database direttamente), autoconcessione
-- e permessi sensibili rifiutati, ultimo titolare protetto, registro senza dati personali.
-- Tutto in una transazione annullata alla fine: nel database non resta nulla.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(41);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000b1', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b2', 'responsabile@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b3', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b4', 'cataloghi@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b5', 'economica@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000b1', 'owner'),
  ('00000000-0000-4000-8000-0000000000b2', 'sales_manager'),
  ('00000000-0000-4000-8000-0000000000b3', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000b4', 'catalog_admin'),
  ('00000000-0000-4000-8000-0000000000b5', 'finance_admin');
insert into public.customers (id, name) values
  ('00000000-0000-4000-8000-0000000000c1', 'Cliente Inventato Permessi');

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.mine() returns text[] language sql as $$
  select coalesce(array_agg(p order by p), '{}') from public.my_permissions() as p;
$$;

set local role authenticated;

-- Preset: gli stessi poteri di prima della K0 (tabella dei ruoli del 3-4 novembre 2026).
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b1');
select is(pg_temp.mine(), (select array_agg(key order by key) from public.permissions),
  'titolare: tutti i permessi');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
select is(pg_temp.mine(),
  array['approvals.view', 'consultants.view', 'customers.deactivate', 'customers.edit', 'customers.view'],
  'responsabile commerciale: come prima');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
select is(pg_temp.mine(), array['customers.edit', 'customers.view'], 'consulente: come prima');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b4');
select is(pg_temp.mine(), array['catalog.manage', 'costs.view'], 'amministrazione cataloghi: come prima');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b5');
select is(pg_temp.mine(),
  array['audit_log.view', 'costs.view', 'customers.edit', 'customers.group_company', 'customers.view',
    'management_control.view', 'margins.view'],
  'amministrazione economica: come prima');
select is(
  (select array_agg(key order by sort_order) from public.permissions where is_sensitive),
  array['costs.view', 'margins.view', 'users.manage', 'customers.export', 'approvals.below_threshold'],
  'i permessi sensibili sono quelli decisi');

-- La versione con un utente a scelta è solo del sistema.
select throws_ok(
  $$select private.user_has_permission('00000000-0000-4000-8000-0000000000b1', 'costs.view')$$,
  '42501', null, 'nessun utente dell''app controlla i permessi di un altro'
);

-- Senza permesso non si scrive, nemmeno direttamente nel database.
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b4', 'customers.view', 'granted')$$,
  '42501', null, 'la consulente non gestisce i permessi'
);
select throws_ok(
  $$insert into public.user_permissions (user_id, permission, granted) values
    ('00000000-0000-4000-8000-0000000000b3', 'customers.deactivate', true)$$,
  '42501', null, 'nessuno scrive le eccezioni direttamente'
);
select throws_ok(
  $$update public.customers set is_active = false where id = '00000000-0000-4000-8000-0000000000c1'$$,
  '42501', null, 'la consulente non disattiva i clienti'
);
select throws_ok(
  $$insert into public.companies (legal_name) values ('Società Inventata')$$,
  '42501', null, 'la consulente non crea società'
);

-- Il titolare: nessuna modifica su se stesso, nessuna eccezione su un titolare.
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b1');
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b1', 'costs.view', 'revoked')$$,
  '42501', 'Nessuno può cambiare i propri permessi', 'nemmeno il titolare cambia i propri permessi'
);

-- Permesso aggiunto: la consulente può disattivare.
select lives_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'customers.deactivate', 'granted')$$,
  'il titolare aggiunge «disattivare clienti» alla consulente'
);
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
select ok('customers.deactivate' = any (pg_temp.mine()), 'la consulente ha il permesso aggiunto');
select lives_ok(
  $$update public.customers set is_active = false where id = '00000000-0000-4000-8000-0000000000c1'$$,
  'e disattiva un cliente'
);
select is(
  (select granted from public.user_permissions where user_id = '00000000-0000-4000-8000-0000000000b3'),
  true, 'la consulente vede la propria eccezione'
);

-- Permesso tolto: senza «modificare clienti» la consulente non scrive più.
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b1');
select lives_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'customers.edit', 'revoked')$$,
  'il titolare toglie «modificare clienti» alla consulente'
);
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
select throws_ok(
  $$insert into public.customers (name) values ('Cliente Non Permesso')$$,
  '42501', null, 'senza permesso la consulente non crea clienti'
);
select throws_ok(
  $$update public.customers set name = 'Nome cambiato' where id = '00000000-0000-4000-8000-0000000000c1'$$,
  '42501', 'Non puoi modificare i clienti', 'né cambia i dati, anche se può disattivare'
);
select lives_ok(
  $$update public.customers set is_active = true where id = '00000000-0000-4000-8000-0000000000c1'$$,
  'disattivare e riattivare restano permessi'
);
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name) values ('00000000-0000-4000-8000-0000000000c1', 'Referente')$$,
  '42501', null, 'né aggiunge referenti'
);

-- Un'eccezione uguale al preset non resta: «default» torna al ruolo.
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b1');
select lives_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'customers.edit', 'granted')$$,
  'ridare un permesso del ruolo'
);
select is(
  (select count(*)::int from public.user_permissions
    where user_id = '00000000-0000-4000-8000-0000000000b3' and permission = 'customers.edit'),
  0, 'ridare un permesso del ruolo cancella l''eccezione'
);

-- Un responsabile con «utenti e autorizzazioni» (sensibile: lo concede il titolare).
select lives_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b2', 'users.manage', 'granted')$$,
  'il titolare concede «utenti e autorizzazioni» al responsabile'
);
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b1', 'customers.view', 'revoked')$$,
  '42501', null, 'il titolare non agisce su se stesso nemmeno passando dal proprio id'
);
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b2', 'catalog.manage', 'granted')$$,
  '42501', 'Nessuno può cambiare i propri permessi', 'il responsabile non si concede permessi'
);
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'costs.view', 'granted')$$,
  '42501', 'I permessi sensibili li concede solo il titolare', 'il responsabile non concede permessi sensibili'
);
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'catalog.manage', 'granted')$$,
  '42501', 'Non puoi concedere un permesso che non hai', 'il responsabile non concede un permesso che non ha'
);
select lives_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b3', 'consultants.view', 'granted')$$,
  'il responsabile concede un permesso non sensibile che ha'
);
select throws_ok(
  $$select public.set_user_permission('00000000-0000-4000-8000-0000000000b1', 'customers.view', 'revoked')$$,
  'P0001', 'Il titolare ha sempre tutti i permessi', 'nessuno toglie permessi al titolare'
);

-- Il preset dei ruoli e l'elenco non si cambiano dall'app.
select throws_ok(
  $$insert into public.role_permissions (role, permission) values ('sales_consultant', 'costs.view')$$,
  '42501', null, 'i preset dei ruoli non si cambiano'
);

-- La sessione in una chiamata: solo la propria riga, con le stesse facoltà di my_permissions.
select pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
select is((select count(*)::int from public.my_session()), 1, 'my_session restituisce solo la propria riga');
select is(
  (select permissions from public.my_session()),
  (select array_agg(p) from public.my_permissions() as p),
  'my_session ha le stesse facoltà di my_permissions'
);

-- Chi non è collegato non legge i permessi.
set local role anon;
select throws_ok($$select * from public.my_permissions()$$, '42501', null,
  'chi non è collegato non chiama la funzione dei permessi');
select throws_ok($$select * from public.my_session()$$, '42501', null,
  'né quella della sessione');
set local role authenticated;

-- Registro: chi, quando e cosa, senza dati personali.
set local role postgres;
create temporary table righe on commit drop as
  select actor_id, coalesce(old_data::text, '') || coalesce(new_data::text, '') as grezzo
  from public.audit_log
  where table_name = 'user_permissions'
    and coalesce(new_data, old_data) ->> 'user_id' in (
      '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3');
select ok((select count(*) from righe) >= 5, 'ogni modifica dei permessi è nel registro');
select ok((select bool_and(actor_id is not null) from righe), 'con chi l''ha fatta');
select is((select count(*)::int from righe where grezzo ~ '@|prova\.test'), 0,
  'senza email o altri dati personali');

-- L'ultimo titolare attivo non si toglie. Nella transazione (annullata alla fine) si
-- disattivano gli altri titolari, poi si prova a togliere l'ultimo.
update public.profiles set is_active = false
  where role = 'owner' and user_id <> '00000000-0000-4000-8000-0000000000b1';
select throws_ok(
  $$update public.profiles set is_active = false where user_id = '00000000-0000-4000-8000-0000000000b1'$$,
  'P0001', 'L''ultimo titolare non si può togliere', 'l''ultimo titolare non si disattiva'
);
select throws_ok(
  $$update public.profiles set role = 'sales_manager' where user_id = '00000000-0000-4000-8000-0000000000b1'$$,
  'P0001', 'L''ultimo titolare non si può togliere', 'né perde il ruolo'
);
select throws_ok(
  $$delete from public.profiles where user_id = '00000000-0000-4000-8000-0000000000b1'$$,
  'P0001', 'L''ultimo titolare non si può togliere', 'né si cancella'
);

select * from finish();
rollback;
