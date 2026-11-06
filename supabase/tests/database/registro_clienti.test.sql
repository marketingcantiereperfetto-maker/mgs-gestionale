-- Nessun dato personale nel registro dei clienti, nemmeno nei dati grezzi: dopo creazione,
-- modifica, disattivazione e cancellazione restano solo id, nome, tipo, stato e nomi dei campi.
-- Tutto in una transazione annullata alla fine: nel database non resta nulla.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(10);

-- La riga creata qui ha una chiave di creazione casuale: la prova la ritrova per chiave
-- (identificativo), mai per nome, così altre righe con lo stesso testo non la confondono.
create temporary table chiavi (label text primary key, key uuid not null default gen_random_uuid()) on commit drop;
insert into chiavi (label) values ('Cliente Inventato');
grant select on chiavi to authenticated;
create function pg_temp.key(label text) returns uuid language sql as $$
  select key from chiavi where chiavi.label = key.label;
$$;

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000b7', 'titolare@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000b7', 'owner');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b7","role":"authenticated"}', true);

insert into public.customers (name, subject_type, tax_code, pec, address_street, foreign_tax_id, creation_key)
values ('Cliente Inventato', 'private', 'RSSMRA85T10A562S', 'privato@pec.prova.test',
        'Via Inventata 7', 'XX999', pg_temp.key('Cliente Inventato'));
update public.customers
  set tax_code = 'RSSMRA85T10A56NH', pec = 'altra@pec.prova.test', address_street = 'Via Nuova 9',
      vat_number = '01234567897', intent_declaration_number = 'DICH-42', intent_declaration_date = '2026-01-15'
  where creation_key = pg_temp.key('Cliente Inventato');
update public.customers set is_active = false where creation_key = pg_temp.key('Cliente Inventato');

set local role postgres;
create temporary table cliente on commit drop as
  select id from public.customers where creation_key = pg_temp.key('Cliente Inventato');
delete from public.customers where id = (select id from cliente);

create temporary table righe on commit drop as
  select action, coalesce(old_data::text, '') || coalesce(new_data::text, '') as grezzo, old_data, new_data
  from public.audit_log where table_name = 'customers'
    and record_id = (select id::text from cliente);

select is((select count(*)::int from righe), 4, 'creazione, due modifiche e cancellazione sono nel registro');
select is(
  (select count(*)::int from righe where grezzo ~ 'RSSMRA|pec\.prova|Via Inventata|Via Nuova|XX999|01234567897|DICH-42|2026-01-15'),
  0, 'nessun valore personale nei dati grezzi del registro'
);
select is(
  (select count(*)::int from righe
    where exists (
      select 1 from jsonb_object_keys(coalesce(new_data, '{}') || coalesce(old_data, '{}')) as k(key)
      where key not in ('id', 'name', 'subject_type', 'is_active', 'changed_fields')
    )),
  0, 'le righe contengono solo id, nome, tipo, stato e nomi dei campi'
);
select is(
  (select new_data -> 'changed_fields' from righe where action = 'insert'),
  '["address_street", "foreign_tax_id", "pec", "tax_code"]'::jsonb,
  'alla creazione: i nomi dei campi compilati'
);
select is(
  (select new_data -> 'changed_fields' from righe
    where action = 'update' and new_data ->> 'is_active' = 'true'),
  '["address_street", "intent_declaration_date", "intent_declaration_number", "pec", "tax_code", "vat_number"]'::jsonb,
  'alla modifica: i nomi dei campi cambiati'
);
select is(
  (select new_data ->> 'is_active' from righe where action = 'update' and old_data ->> 'is_active' = 'true' and new_data ->> 'is_active' = 'false'),
  'false', 'la disattivazione resta riconoscibile'
);
select is(
  (select new_data -> 'changed_fields' from righe where action = 'update' and new_data ->> 'is_active' = 'false'),
  '[]'::jsonb, 'disattivare non elenca campi (lo stato è già nella riga)'
);
select is(
  (select old_data -> 'changed_fields' from righe where action = 'delete'),
  '["address_street", "foreign_tax_id", "intent_declaration_date", "intent_declaration_number", "pec", "tax_code", "vat_number"]'::jsonb,
  'alla cancellazione: i nomi dei campi presenti, senza valori'
);
select is((select new_data from righe where action = 'delete'), null, 'la cancellazione non ha dati nuovi');
select ok(
  (select bool_and(new_data ->> 'subject_type' = 'private' or old_data ->> 'subject_type' = 'private') from righe),
  'il tipo di soggetto resta in chiaro'
);

select * from finish();
rollback;
