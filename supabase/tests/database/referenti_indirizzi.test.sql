-- Referenti e indirizzi di consegna: permessi per ruolo, un solo principale/predefinito,
-- disattivazione solo per titolare e responsabile commerciale, collegamento al cliente che non
-- cambia, controlli su email, telefono e indirizzo. Transazione annullata alla fine.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(36);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000d1', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d2', 'responsabile@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d3', 'cataloghi@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d4', 'economica@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000d1', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000d2', 'sales_manager'),
  ('00000000-0000-4000-8000-0000000000d3', 'catalog_admin'),
  ('00000000-0000-4000-8000-0000000000d4', 'finance_admin');
insert into public.customers (id, name) values
  ('00000000-0000-4000-8000-0000000000e1', 'Cliente Inventato Uno'),
  ('00000000-0000-4000-8000-0000000000e2', 'Cliente Inventato Due');

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.contact(contact_name text) returns uuid language sql as $$
  select id from public.customer_contacts where name = contact_name;
$$;
create function pg_temp.address(street_name text) returns uuid language sql as $$
  select id from public.customer_delivery_addresses where street = street_name;
$$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000d1');

-- Referenti -------------------------------------------------------------------------------------
select lives_ok(
  $$insert into public.customer_contacts (customer_id, name, role, email, phone) values
    ('00000000-0000-4000-8000-0000000000e1', 'Anna Inventata', 'Acquisti', 'anna@prova.test', '+39 (02) 1234-5678')$$,
  'la consulente aggiunge un referente'
);
select ok((select is_primary from public.customer_contacts where id = pg_temp.contact('Anna Inventata')),
  'il primo referente attivo diventa principale da solo');
select lives_ok(
  $$insert into public.customer_contacts (customer_id, name) values
    ('00000000-0000-4000-8000-0000000000e1', 'Bruno Inventato')$$,
  'basta il nome'
);
select ok(not (select is_primary from public.customer_contacts where id = pg_temp.contact('Bruno Inventato')),
  'il secondo referente non è principale');
select lives_ok(
  $$insert into public.customer_contacts (customer_id, name, phone) values
    ('00000000-0000-4000-8000-0000000000e1', 'Carla Inventata', '02/1234567'),
    ('00000000-0000-4000-8000-0000000000e1', 'Dario Inventato', '333.123.4567'),
    ('00000000-0000-4000-8000-0000000000e1', 'Elena Inventata', '0039 333 1234567')$$,
  'telefoni con barre, punti e prefisso internazionale accettati'
);
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name, phone) values
    ('00000000-0000-4000-8000-0000000000e1', 'Telefono Corto', '12-345')$$,
  '23514', null, 'telefono con meno di 6 cifre rifiutato'
);
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name, phone) values
    ('00000000-0000-4000-8000-0000000000e1', 'Telefono Lettere', 'chiama 1234567')$$,
  '23514', null, 'telefono con lettere rifiutato'
);
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name, email) values
    ('00000000-0000-4000-8000-0000000000e1', 'Email Sbagliata', 'anna-prova.test')$$,
  '23514', null, 'email non valida rifiutata'
);
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name) values
    ('00000000-0000-4000-8000-0000000000e1', '')$$,
  '23514', null, 'nome obbligatorio'
);

select lives_ok(
  $$select public.set_primary_customer_contact(pg_temp.contact('Bruno Inventato'))$$,
  'la consulente sceglie il referente principale'
);
select is(
  (select array_agg(name order by name) from public.customer_contacts where customer_id = '00000000-0000-4000-8000-0000000000e1' and is_primary),
  array['Bruno Inventato'], 'un solo referente principale per cliente'
);
select throws_ok(
  $$select public.set_customer_contact_active(pg_temp.contact('Anna Inventata'), false)$$,
  '42501', null, 'la consulente non disattiva i referenti'
);
select throws_ok(
  $$update public.customer_contacts set is_active = false where name = 'Anna Inventata'$$,
  '42501', null, 'nemmeno cambiando lo stato direttamente'
);
select throws_ok(
  $$update public.customer_contacts set is_primary = true where name = 'Anna Inventata'$$,
  '42501', null, 'il principale si cambia solo con la funzione'
);
select throws_ok(
  $$update public.customer_contacts set customer_id = '00000000-0000-4000-8000-0000000000e2' where name = 'Anna Inventata'$$,
  '42501', null, 'il cliente di un referente non si cambia (permesso)'
);
select lives_ok(
  $$update public.customer_contacts set role = 'Amministrazione', email = 'anna.nuova@prova.test' where name = 'Anna Inventata'$$,
  'la consulente modifica i dati del referente'
);

select pg_temp.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  $$select public.set_customer_contact_active(pg_temp.contact('Bruno Inventato'), false)$$,
  'P0001', 'Scegli prima un altro referente principale',
  'il principale non si disattiva finché ci sono altri referenti attivi'
);
select lives_ok(
  $$select public.set_customer_contact_active(pg_temp.contact('Anna Inventata'), false)$$,
  'il responsabile commerciale disattiva un referente'
);
select throws_ok(
  $$select public.set_primary_customer_contact(pg_temp.contact('Anna Inventata'))$$,
  'P0001', null, 'un referente disattivato non può essere principale'
);
select lives_ok(
  $$select public.set_customer_contact_active(pg_temp.contact('Anna Inventata'), true)$$,
  'e lo riattiva'
);
select ok(not (select is_primary from public.customer_contacts where id = pg_temp.contact('Anna Inventata')),
  'riattivato non ruba il ruolo di principale');

select pg_temp.as_user('00000000-0000-4000-8000-0000000000d3');
select is((select count(*)::int from public.customer_contacts), 0, 'l''amministrazione cataloghi non vede i referenti');
select throws_ok(
  $$insert into public.customer_contacts (customer_id, name) values ('00000000-0000-4000-8000-0000000000e1', 'Intruso')$$,
  '42501', null, 'e non li aggiunge'
);

select pg_temp.as_user('00000000-0000-4000-8000-0000000000d4');
select lives_ok(
  $$insert into public.customer_contacts (customer_id, name) values ('00000000-0000-4000-8000-0000000000e2', 'Franca Inventata')$$,
  'l''amministrazione economica aggiunge referenti'
);

-- Indirizzi di consegna -------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-4000-8000-0000000000d1');
select lives_ok(
  $$insert into public.customer_delivery_addresses (customer_id, description, street, postal_code, city, province, country) values
    ('00000000-0000-4000-8000-0000000000e1', 'Magazzino', 'Via Inventata 1', '00100', 'Comune di Prova', 'RM', 'IT')$$,
  'la consulente aggiunge un indirizzo'
);
select ok((select is_default from public.customer_delivery_addresses where id = pg_temp.address('Via Inventata 1')),
  'il primo indirizzo attivo diventa predefinito');
select throws_ok(
  $$insert into public.customer_delivery_addresses (customer_id, street, city) values
    ('00000000-0000-4000-8000-0000000000e1', 'Via Senza Paese 2', 'Comune di Prova')$$,
  '23502', null, 'il paese è obbligatorio'
);
select throws_ok(
  $$insert into public.customer_delivery_addresses (customer_id, street, city, postal_code, country) values
    ('00000000-0000-4000-8000-0000000000e1', 'Via Cap Corto 3', 'Comune di Prova', '123', 'IT')$$,
  '23514', null, 'in Italia il CAP ha 5 cifre'
);
select lives_ok(
  $$insert into public.customer_delivery_addresses (customer_id, street, city, postal_code, country) values
    ('00000000-0000-4000-8000-0000000000e1', 'Rue Inventée 4', 'Ville de Test', 'F-75001', 'FR')$$,
  'all''estero il CAP è libero'
);
select lives_ok(
  $$select public.set_default_customer_address(pg_temp.address('Rue Inventée 4'))$$,
  'la consulente sceglie l''indirizzo predefinito'
);
select throws_ok(
  $$select public.set_customer_address_active(pg_temp.address('Via Inventata 1'), false)$$,
  '42501', null, 'la consulente non disattiva gli indirizzi'
);
select throws_ok(
  $$update public.customer_delivery_addresses set customer_id = '00000000-0000-4000-8000-0000000000e2' where street = 'Via Inventata 1'$$,
  '42501', null, 'il cliente di un indirizzo non si cambia (permesso)'
);

select pg_temp.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  $$select public.set_customer_address_active(pg_temp.address('Rue Inventée 4'), false)$$,
  'P0001', 'Scegli prima un altro indirizzo predefinito',
  'il predefinito non si disattiva finché ci sono altri indirizzi attivi'
);
select lives_ok(
  $$select public.set_customer_address_active(pg_temp.address('Via Inventata 1'), false)$$,
  'il responsabile commerciale disattiva un indirizzo'
);

-- Il collegamento resta fisso anche per gli strumenti di amministrazione.
set local role postgres;
select throws_ok(
  $$update public.customer_contacts set customer_id = '00000000-0000-4000-8000-0000000000e2' where name = 'Bruno Inventato'$$,
  '42501', 'Il cliente collegato non si può cambiare', 'il cliente di un referente non si cambia nemmeno dall''amministrazione'
);
select throws_ok(
  $$update public.customer_delivery_addresses set customer_id = '00000000-0000-4000-8000-0000000000e2' where street = 'Rue Inventée 4'$$,
  '42501', 'Il cliente collegato non si può cambiare', 'il cliente di un indirizzo non si cambia nemmeno dall''amministrazione'
);

select * from finish();
rollback;
