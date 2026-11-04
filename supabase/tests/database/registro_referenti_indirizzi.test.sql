-- Nessun dato personale nel registro di referenti e indirizzi, nei dati grezzi: dopo creazione,
-- modifica, disattivazione e cancellazione restano solo id, id del cliente, stato e nomi dei
-- campi. Nemmeno il nome del referente o la descrizione dell'indirizzo. Transazione annullata.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000f1', 'titolare@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000f1', 'owner');
insert into public.customers (id, name) values
  ('00000000-0000-4000-8000-0000000000f2', 'Cliente Inventato Registro');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);

insert into public.customer_contacts (customer_id, name, role, email, phone) values
  ('00000000-0000-4000-8000-0000000000f2', 'Gianna Segreta', 'Titolare', 'gianna@segreta.test', '+39 333 9876543');
update public.customer_contacts
  set name = 'Gianna Segretissima', email = 'gianna.nuova@segreta.test', phone = '06 7654321'
  where customer_id = '00000000-0000-4000-8000-0000000000f2';
select public.set_customer_contact_active(
  (select id from public.customer_contacts where customer_id = '00000000-0000-4000-8000-0000000000f2'), false);

insert into public.customer_delivery_addresses (customer_id, description, street, postal_code, city, province, country)
values ('00000000-0000-4000-8000-0000000000f2', 'Casa di Gianna', 'Via Segreta 12', '00199', 'Borgo Segreto', 'RM', 'IT');
update public.customer_delivery_addresses
  set street = 'Piazza Segreta 3', description = 'Villa di Gianna'
  where customer_id = '00000000-0000-4000-8000-0000000000f2';

set local role postgres;
delete from public.customer_contacts where customer_id = '00000000-0000-4000-8000-0000000000f2';
delete from public.customer_delivery_addresses where customer_id = '00000000-0000-4000-8000-0000000000f2';

create temporary table righe on commit drop as
  select table_name, action, coalesce(old_data::text, '') || coalesce(new_data::text, '') as grezzo,
    old_data, new_data
  from public.audit_log
  where table_name in ('customer_contacts', 'customer_delivery_addresses')
    and coalesce(new_data, old_data) ->> 'customer_id' = '00000000-0000-4000-8000-0000000000f2';

select is((select count(*)::int from righe where table_name = 'customer_contacts'), 4,
  'referente: creazione, modifica, disattivazione e cancellazione nel registro');
select is((select count(*)::int from righe where table_name = 'customer_delivery_addresses'), 3,
  'indirizzo: creazione, modifica e cancellazione nel registro');
select is(
  (select count(*)::int from righe
    where grezzo ~* 'gianna|segret|titolare|9876543|7654321|borgo|casa di|villa di'),
  0, 'nessun nome di persona, email, telefono, via o descrizione nei dati grezzi'
);
select is(
  (select count(*)::int from righe
    where exists (
      select 1 from jsonb_object_keys(coalesce(new_data, '{}') || coalesce(old_data, '{}')) as k(key)
      where key not in ('id', 'customer_id', 'is_active', 'changed_fields')
    )),
  0, 'le righe contengono solo id, id del cliente, stato e nomi dei campi'
);
select is(
  (select new_data -> 'changed_fields' from righe where table_name = 'customer_contacts' and action = 'insert'),
  '["email", "is_primary", "name", "phone", "role"]'::jsonb,
  'creazione del referente: i nomi dei campi compilati'
);
select is(
  (select new_data -> 'changed_fields' from righe
    where table_name = 'customer_contacts' and action = 'update' and new_data ->> 'is_active' = 'true'),
  '["email", "name", "phone"]'::jsonb,
  'modifica del referente: i nomi dei campi cambiati'
);
select is(
  (select new_data -> 'changed_fields' from righe
    where table_name = 'customer_delivery_addresses' and action = 'update'),
  '["description", "street"]'::jsonb,
  'modifica dell''indirizzo: i nomi dei campi cambiati'
);
select is(
  (select new_data ->> 'is_active' from righe
    where table_name = 'customer_contacts' and action = 'update' and old_data ->> 'is_active' = 'true'
      and new_data ->> 'is_active' = 'false'),
  'false', 'la disattivazione resta riconoscibile'
);

select * from finish();
rollback;
